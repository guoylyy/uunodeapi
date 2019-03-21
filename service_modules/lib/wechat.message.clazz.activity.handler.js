'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const moment = require('moment');
const Promise = require('bluebird');

const systemConfig = require('../../config/config');
const enumModel = require('../services/model/enum');

const clazzActivityService = require('../services/clazzActivity.service');

const wechatAuth = require('./wechat.auth');
const wechatCustomMessage = require('./wechat.custom.message');
const wechatTemplateMessage = require('./wechat.template.message');
const wechatTemplateReply = require('./wechat.template.reply');

const MODULE_NAME = '活动消息处理器';
const OPEN_SUCCESS_MESSAGE = '#U树洞#成功开启，接下来15分钟发送的消息会转发给你的优伴';
const OPEN_FAIL_MESSAGE = '#U树洞#开启失败，你的优伴出了点状况，别着急，我们已经提醒对方了';
const OPEN_ALERT_MESSAGE = '#U树洞#惊坐起，你的优伴开启了树洞，你们可以交流了';
const SECRET_SIGNAL = 'U树洞开启';


/**
 * 获取用户活动记录
 *
 * @param activityInfo
 * @param userId
 * @returns {Promise.<TResult>}
 */
const fetchUserActivityRecord = (activityInfo, userId) => {
  return clazzActivityService.fetchActivityAccountItem(activityInfo, { id: userId })
      .then((activityAccountItem) => {
        const roomId = _.get(activityAccountItem, 'clazzActivityRoom');
        // 未找到房间信息
        if (_.isNil(roomId)) {
          return Promise.resolve(null);
        }

        return clazzActivityService.fetchActivityRoomById(roomId, userId);
      })
      .then((activityRoomItem) => {
        // 未找到房间信息
        if (_.isNil(activityRoomItem)) {
          return Promise.resolve(null);
        }

        return {
          activityRoom: activityRoomItem,
          userInfo: activityRoomItem.userInfo,
          partnerInfo: activityRoomItem.partnerInfo
        };
      });
};

/**
 * 构造并推送TEXT类微信客服消息
 *
 * @param targetUserOpenId
 * @param content
 * @returns {Promise.<T>}
 */
const constructAndSendCustomTextMessage = (targetUserOpenId, content) => {
  const customerMessageContent = wechatCustomMessage.makeCustomMessage(
      targetUserOpenId,
      enumModel.customizedMsgTypeEnum.TEXT.key,
      { content: content }
  );

  return wechatCustomMessage.sendCustomMessage(customerMessageContent);
};

/*
 构造微信客服消息内容
 */
const constructAndSendCustomMessage = (targetUserOpenId, senderOpenId, messageType, wechatMessageData) => {
  const xmlMessage = wechatMessageData.xml;

  let customerMessageContent;
  switch (messageType) {
    case 'text':
      const messageContent = xmlMessage.Content[0];

      customerMessageContent = wechatCustomMessage.makeCustomMessage(
          targetUserOpenId,
          enumModel.customizedMsgTypeEnum.TEXT.key,
          { content: messageContent }
      );
      break;
    case 'voice':
      const voiceMediaId = xmlMessage.MediaId[0];

      customerMessageContent = wechatCustomMessage.makeCustomMessage(
          targetUserOpenId,
          enumModel.customizedMsgTypeEnum.VOICE.key,
          { media_id: voiceMediaId }
      );
      break;
    case 'image':
      const imageMediaId = xmlMessage.MediaId[0];

      customerMessageContent = wechatCustomMessage.makeCustomMessage(
          targetUserOpenId,
          enumModel.customizedMsgTypeEnum.IMAGE.key,
          { media_id: imageMediaId }
      );
      break;
    case 'video':
    case 'shortvideo':
    default:
      customerMessageContent = wechatCustomMessage.makeCustomMessage(
          senderOpenId,
          enumModel.customizedMsgTypeEnum.TEXT.key,
          { content: 'Uband 亲爱的，我不知道如何处理您的消息' }
      );
      break;
  }

  return Promise.resolve(wechatCustomMessage.sendCustomMessage(customerMessageContent));
};

/**
 * 记录聊天内容
 *
 * @param roomId
 * @param userId
 * @param msgType
 * @param wechatMessageData
 * @returns {Promise|Promise.<T>}
 */
const recordChatContent = (roomId, userId, msgType, wechatMessageData) => {
  const messageContent = _.get(wechatMessageData, 'xml.Content.0', null);
  const mediaId = _.get(wechatMessageData, 'xml.MediaId.0', null);

  const recordItem = {
    clazzActivityRoom: roomId,
    userId: userId,
    messageType: msgType,
    mediaId: mediaId,
    textContent: messageContent, // 文字消息的内容
  };

  return clazzActivityService.createActivityRoomRecord(recordItem)
      .catch((error) => {
        winston.error(error);
        // todo 错误处理
      });
};

/**
 * 早起交友活动处理器
 *
 * @param loginInfo
 * @param msgType
 * @param wechatMessageData
 * @returns {*}
 */
const morningCallHandler = (loginInfo, msgType, wechatMessageData) => {
  const userId = loginInfo.account.id,
      activityItem = loginInfo.activity;

  const isActivityOpen = _.get(activityItem, 'isOpen', false);

  if (isActivityOpen !== true) {
    return Promise.resolve(true);
  }

  return fetchUserActivityRecord(activityItem, userId)
      .then((userActivityRecord) => {
        // 未参加，直接返回
        if (_.isNil(userActivityRecord)) {
          return true;
        }

        const userOpenId = userActivityRecord.userInfo.openId,
            partnerOpenId = userActivityRecord.partnerInfo.openId,
            activityRoomStatus = _.get(userActivityRecord, 'activityRoom.status', null),
            roomId = _.get(userActivityRecord, 'activityRoom.id', null);

        switch (activityRoomStatus) {
          case enumModel.activityRoomStatusEnum.OPEN.key:
            winston.info('# U树洞 # 房间 # %s # 中的用户 # %s # 发送 # %s # 类型的消息', userActivityRecord.activityRoom.id, userId, msgType);
            // 直接推送消息给对方
            return constructAndSendCustomMessage(partnerOpenId, userOpenId, msgType, wechatMessageData)
                .then((customMessageResult) => {
                  debug(customMessageResult);

                  // 记录消息
                  recordChatContent(roomId, userId, msgType, wechatMessageData);

                  return false;
                });
          case enumModel.activityRoomStatusEnum.CLOSED.key:
            const messageContent = _.get(wechatMessageData.xml, 'Content.0', null);

            // 消息类型为text，且内容为暗号
            if (msgType === 'text' && messageContent === SECRET_SIGNAL) {
              /**
               *  1. 通知对方
               *    1.1 成功， 则
               *              1. 更新房间状态
               *              2. 提醒用户已开始
               *    1.2 失败， 则提醒用户对方未收到
               */
              return constructAndSendCustomTextMessage(partnerOpenId, OPEN_ALERT_MESSAGE)
                  .then((customMessageResult) => {
                    debug(customMessageResult);

                    if (customMessageResult === true) {
                      const roomEndDate = moment().add(15, 'minutes').toDate();
                      const openRoomPromise = clazzActivityService.updateActivityRoomStatusById(roomId, enumModel.activityRoomStatusEnum.OPEN.key, roomEndDate)
                          .catch((error) => {
                            debug(error);

                            clazzActivityService.updateActivityRoomStatusById(roomId, enumModel.activityRoomStatusEnum.CLOSED.key);

                            return Promise.reject(error);
                          });
                      const notifyCurrentUserPromise = constructAndSendCustomTextMessage(userOpenId, OPEN_SUCCESS_MESSAGE);

                      return Promise.all([openRoomPromise, notifyCurrentUserPromise])
                          .then((results) => {
                            debug(results);

                            return false;
                          })
                          .catch((error) => {
                            winston.error(error);

                            return false;
                          })
                    } else {
                      // 通知用户 连接失败
                      constructAndSendCustomTextMessage(userOpenId, OPEN_FAIL_MESSAGE);

                      // 通知对方 你的优伴正在找你
                      wechatAuth.requestLocalWechatAccessToken()
                          .then((wechatToken) => {
                            const activityAlertMsg = wechatTemplateMessage.ACTIVITY_ALERT(
                                partnerOpenId,
                                '垂死病中惊坐起，你的优伴在找你。',
                                '#U树洞#',
                                'Uband友班',
                                '您好，你的优伴发送了消息可以是你却迟迟不回，对方很着急\n回复"' + SECRET_SIGNAL + '" 联系对方吧'
                            );
                            wechatTemplateReply.postTemplateWithToken(activityAlertMsg, wechatToken, true, activityItem.id, userActivityRecord.partnerInfo.id);
                          });

                      return false;
                    }
                  });
            }

            // 正常处理流程
            return true;
            break;
          default:
            winston.error(`[ ${ MODULE_NAME } ] 用户未分配房间或房间状态有误！！！ loginInfo: %j, msgType: %j, wechatMessageData: %j`, loginInfo, msgType, wechatMessageData);
            return true;
        }
      });
};

const pub = {};

pub.activityMessageHandler = (loginInfo, msgType, wechatMessageData) => {
  const activityHandlerPromiseList = _.map(systemConfig.ACTIVITY_CONFIG, (activityConfig, activityType) => {
    switch (activityType) {
      case enumModel.activityTypeEnum.MORNING_CALL.key:
        const updatedLoginInfo = _.extend({}, loginInfo, { activity: activityConfig });
        return morningCallHandler(updatedLoginInfo, msgType, wechatMessageData)
            .catch((error) => {
              winston.error(error);
            });
        break;
      default:
        winston.error('不支持的活动类型');
        return Promise.resolve(true);
        break;
    }
  });

  return Promise.all(activityHandlerPromiseList)
      .then((handlerResultList) => {
        // 只要处理函数中包含false，则返回false
        return !_.includes(handlerResultList, false)
      });
};

module.exports = pub;
