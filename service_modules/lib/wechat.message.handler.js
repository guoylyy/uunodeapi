'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const moment = require('moment');
const uuidV1 = require('uuid/v1');
const uuidV4 = require('uuid/v4');

const wechatReply = require('./wechat.reply');
const systemConfig = require('../../config/config');
const enumModel = require('../services/model/enum');

const clazzUtil = require('../services/util/clazz.util');

const userFileService = require('../services/userFile.service');

const wechatMessageClazzActivityHandler = require('./wechat.message.clazz.activity.handler');

const URL_REGEX = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;
const JOINED_STATUS_LIST = [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key];

const SIGNATURE = "Uband ";
const UNKNOWN_MSG = "您发送了什么？我笃君读书少，不认识。";
const ERROR_MSG = "很遗憾，消息发送失败，似乎服务器开了一点小差！";

//默认消息
let getDefaultMsg = () => {
  return SIGNATURE + "已收到您的消息。";
};

//ADVICE MSG
let getAdviceMsg = () => {
  return SIGNATURE + "好像你还没有加入任何班级哦。";
};

//打卡消息回复提示
let getCheckinMsg = (isSuccess) => {
  if (isSuccess === true) {
    return "已收到一份努力，真棒，不要忘记打卡哦。";
  } else {
    return ERROR_MSG;
  }
};

/**
 * 生成唯一的文件key
 *
 * @returns {string}
 */
let getFileKey = () => {
  return uuidV1() + '-' + uuidV4();
};

const supportedDomains = _.keys(systemConfig.CHECKIN_SUPPORT_DOMAIN);

/**
 * 补打卡自动回复处理
 *
 * @param account
 * @param baseResult
 */
let addCheckinAutoReplyHandler = (account, baseResult) => {
  let now = new moment();
  // todo 获取用户参加的班级
  return Promise.resolve([])
      .then((clazzList) => {
        /**
         * 构造补打卡消息
         *  1，过滤课程
         *  2. 累加消息
         */
        let reducedAddCheckStr = _.chain(clazzList)
            .filter((clazzItem) => {
              // 1，过滤课程

              if (!_.includes(JOINED_STATUS_LIST, clazzItem.status)) {
                return false;
              }

              let startDate = moment(clazzItem.startDate),
                  joinDate = moment(clazzItem.joinDate),
                  taskCount = clazzItem.configuration.taskCount;

              if (!startDate.isBefore(now, 'day')) {
                return false;
              }

              let dayNumber = clazzUtil.calculateClazzDayNumber(startDate, joinDate, clazzItem.clazzType);

              return dayNumber <= taskCount && dayNumber > 0;
            })
            .reduce(
                (content, clazzItem, index) => {
                  /**
                   * 生成补打卡链接
                   * 按照如下格式构造数据
                   *    1)  课程名称  超链接地址
                   */
                  // todo 打卡链接更新
                  return content + (index + 1) + ") : " + clazzItem.name + "\t<a href='" + systemConfig.BASE_URL + "/study#/studyList?id=" + clazzItem.id + "'>补打卡点我</a>\n";
                },
                ''
            )
            .value();

        if (_.isEmpty(reducedAddCheckStr)) {
          reducedAddCheckStr = '\t空空如也';
        }

        return wechatReply.makeReply(baseResult, 'TEXT', { Content: '补打卡列表：\n' + reducedAddCheckStr });
      })
};

/**
 * 最近活动自动回复处理
 * @param baseResult
 */
let recentActivityAutoReplyHandler = (baseResult) => {
  // todo 获得今天及以后的最近20个活动
  return Promise.resolve([])
      .then((recentActivityList) => {
        /**
         * 构造最近活动消息
         *  1. 按照日期分组
         *  2. 累加消息
         */
        let reducedActivitiesStr = _.chain(recentActivityList)
            .groupBy((recentActivityItem) => moment(recentActivityItem.date).format('MM-DD'))
            .reduce(
                (content, activities, key) => {
                  /**
                   * (开始时间 ~ 结束时间) 活动标题
                   */
                  let activitiesStr = _.reduce(
                      activities,
                      // todo 更新链接地址
                      (innerMemo, activity) => innerMemo + '  (' + activity.get('startTime') + ' ~ ' + activity.get('endTime') + ')  <a href="' + config.BASE_URL + '/weh5/calendar/activity/' + activity.id + '">' + activity.get('title') + '</a>\n',
                      ''
                  );

                  return content + key + '\n' + activitiesStr;
                },
                ''
            )
            .value();

        if (_.isEmpty(reducedActivitiesStr)) {
          reducedActivitiesStr = '\t空空如也';
        }

        return wechatReply.makeReply(baseResult, 'TEXT', { Content: '最近活动：\n' + reducedActivitiesStr });
      });
};

/**
 * 外链打卡处理函数
 *
 * @param key
 * @param baseResult
 * @param openId
 * @param loginInfo
 * @returns {Promise.<[boolean,*]>}
 */
let linkCheckinHandler = (key, baseResult, openId, loginInfo) => {
  if (URL_REGEX.test(key)) {
    // 链接校验
    var link = URL_REGEX.exec(key)[0];
    for (let i = 0, length = supportedDomains.length; i < length; ++i) {
      let spDomain = supportedDomains[i];

      // 找到了打卡项
      if (link.indexOf(spDomain) > 0) {
        let userFile = {
          openId: openId,
          hasCheckined: false,
          userId: loginInfo.account.id,
          upTime: new Date(),
          fileType: 'weblink',
          format: 'text',
          fileUrl: link,
          fileKey: getFileKey()
        };

        debug(userFile);

        return saveUserFilePromise(userFile, baseResult, openId)
            .then((baseResult) => {
              return [false, baseResult];
            })
      }
    }

    return Promise.resolve([true, baseResult]);
  }

  return Promise.resolve([true, baseResult]);
};

let DYNAMIC_AUTO_REPLY_LIST = []; // ['补打卡', '最近活动'];
/**
 * 自定义事件处理
 *  返回是否继续处理，如果是自定义处理则返回false； 否则，返回true
 * @param key
 * @param baseResult
 * @param loginInfo
 * @returns {boolean}
 */
let dynamicAutoReplayHandler = (key, baseResult, loginInfo) => {
  debug(key, baseResult, loginInfo);
  debug('includes ? : %s', _.includes(DYNAMIC_AUTO_REPLY_LIST, key));
  // 如果在自定义处理列表中， 则处理事件， 并返回 false 表示事件不继续处理
  if (_.includes(DYNAMIC_AUTO_REPLY_LIST, key)) {
    switch (key) {
      case '补打卡':
        debug('补打卡');
        return addCheckinAutoReplyHandler(loginInfo.account, baseResult)
            .then((baseResult) => {
              return [false, baseResult];
            });
      case '最近活动':
        debug('最近活动');
        return recentActivityAutoReplyHandler(baseResult, errorHandler)
            .then((baseResult) => {
              return [false, baseResult];
            });
      default:
        // 默认情况
        break;
    }

    return Promise.resolve([false, baseResult]);
  }

  // 如果不在自定义处理列表中, 则返回 true 表示事件未处理
  return Promise.resolve([true, baseResult]);
};


let preLoginAspect = (msgType, msg, baseResult) => {
  return Promise.resolve({});
};

let textMsgHandler = (msg, baseResult, loginInfo) => {
  let key = msg.xml.Content[0],
      openId = msg.xml.FromUserName[0];

  // 增加默认回复消息
  baseResult.xml.Content = getDefaultMsg();

  debug(key, openId);
  // 1. 先处理链接打卡逻辑
  return linkCheckinHandler(key, baseResult, openId, loginInfo)
      .then((results) => {
        let aspectRc = results[0];
        baseResult = results[1];

        debug('textMsgHandler 1 %s, %j', aspectRc, baseResult);

        winston.info("textMsgHandler 1: %s", aspectRc);

        if (aspectRc === true) {
          // 2. 处理 动态自动回复
          return dynamicAutoReplayHandler(key, baseResult, loginInfo);
        } else {
          return Promise.resolve([true, baseResult]);
        }
      })
      .then((results) => {
        let aspectRc = results[0];
        baseResult = results[1];

        debug('textMsgHandler 2 %s, %j', aspectRc, baseResult);

        winston.info("textMsgHandler 2: %s", aspectRc);

        return wechatReply.autoReply('MSG', key, baseResult);
      });
};

//用户发送过来的文件保存
let saveUserFilePromise = (userFile, baseResult, openId) => {
  return userFileService.createUserFile(userFile)
      .then((userFileItem) => {
        debug(userFileItem);

        baseResult.xml.Content = getCheckinMsg(true);
        winston.info('[savefile_success]: %s', openId);

        return baseResult;
      })
      .catch((error) => {
        //保存打卡信息失败,存一波记录
        winston.error(error);
        winston.info('[savefile_error_p0]:', baseResult.xml);

        baseResult.xml.Content = getCheckinMsg(false);

        return baseResult;
      });
};

// 保存打卡文件成功
let saveTeacherFilePromise = (file, baseResult, openId) => {
  return saveUserFilePromise(file, baseResult, openId)
      .then((baseResult) => {
        baseResult.xml.Content = "已收到回复";
        winston.info('[save_teacher_userfile_success]: %s', openId);

        // todo 查看是否有正在点评的任务
        return Promise.resolve(null)
            .then((qa) => {
              if (qa != null) {
                let answers = qa.answers;

                if (answers) {
                  answers.fileIds.push(data.id);
                } else {
                  answers = {
                    fileIds: [data.id]
                  };
                }

                qa.answers = answers;
                // todo 保存
                return Promise.resolve(qa)
                    .then((qaObj) => {
                      return baseResult;
                    });
              }

              return baseResult;
            });
      })
      .catch((error) => {
        //保存打卡信息失败,存一波记录
        winston.info(error);
        winston.info('[savefile_error_p0]:', baseResult.xml);

        baseResult.xml.Content = getCheckinMsg(false);

        return baseResult;
      });
};

let wechatFileHandler = (msg, baseResult, fileType, loginInfo) => {
  let openId = msg.xml.FromUserName[0];

  let userFile = {
    userId: loginInfo.account.id,
    hasCheckined: false,
    openId: openId,
    fileType: fileType,
    upTime: new Date(),
    fileKey: null
  };

  if (fileType === 'voice') {
    userFile.fileKey = msg.xml.MediaId[0];
    userFile.format = msg.xml.Format[0];
  } else if (fileType === 'image') {
    userFile.fileKey = msg.xml.MediaId[0];
    userFile.fileUrl = msg.xml.PicUrl[0];
  } else if (fileType === 'video' || fileType === 'shortvideo') {
    userFile.fileKey = msg.xml.MediaId[0];
  }

  debug(userFile);

  if (loginInfo.isTeacher) {
    return saveTeacherFilePromise(userFile, baseResult, openId);
  }

  return saveUserFilePromise(userFile, baseResult, openId);
};

/**
 * 处理发送来的消息接口
 *
 * @param msgData
 * @param loginInfo
 * @returns {Promise.<TResult>|Promise|*}
 */
module.exports = (msgData, loginInfo) => {
  let msgType = msgData.xml.MsgType[0];
  //基础消息模板
  let baseResult = wechatReply.getBaseResult(msgData);
  baseResult.xml.MsgType = 'text'; //目前不涉及其他消息类型

  debug(msgType);
  debug(baseResult);

  return preLoginAspect(msgType, msgData, baseResult)
      .then((baseResult) => {
        // 游戏互发消息处理
        return wechatMessageClazzActivityHandler.activityMessageHandler(loginInfo, msgType, msgData);
      })
      .then((isContinue) => {
        if (isContinue === false) {
          return 'success';
        }

        switch (msgType) {
          case 'text':
            return textMsgHandler(msgData, baseResult, loginInfo);
            break;
          case 'voice':
          case 'image':
          case 'video':
          case 'shortvideo':
            //不管是否加入,无脑保存先
            return wechatFileHandler(msgData, baseResult, msgType, loginInfo);
            break;
          default:
            baseResult.xml.Content = UNKNOWN_MSG;
            break;
        }

        return baseResult;
      });
};
