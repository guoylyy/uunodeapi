'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const Promise = require('bluebird');
const request = require('request');

const enumModel = require('../services/model/enum');
const wechatAuth = require('./wechat.auth');

let compliedCustomMessageUrlTemplate = _.template('https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${ token }');
let getCustomMessageUrl = (token) => {
  return compliedCustomMessageUrlTemplate({ token: token });
};


/**
 * 自动回复客服工厂
 */
let AUTO_CUSTOM_MESSAGE_FACTORY = {
  TEXT: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'text';
    baseResult['text'] = { 'content': contentObj['Content'] };
    return baseResult;
  },
  VOICE: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'voice';
    baseResult['voice'] = { 'media_id': contentObj['MediaId'] };
    return baseResult;
  },
  IMAGE: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'image';
    baseResult['image'] = { 'media_id': contentObj['MediaId'] };
    return baseResult;
  },
  VIDEO: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'video';
    baseResult['video'] = {
      'media_id' : contentObj['MediaId'],
      'description': 'video'
    };
    return baseResult;
  },
  NEWS: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'news';
    baseResult['news'] = { 'articles': contentObj};
    return baseResult;
  }
};


/**
 * 客服消息构造工厂
 *
 * @type {{type: Function}}
 */
let CUSTOM_MESSAGE_FACTORY = {
  TEXT: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'text';
    baseResult['text'] = { 'content': contentObj['content'] };
    return baseResult;
  },
  VOICE: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'voice';
    baseResult['voice'] = { 'media_id': contentObj['media_id'] };
    return baseResult;
  },
  IMAGE: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'image';
    baseResult['image'] = { 'media_id': contentObj['media_id'] };
    return baseResult;
  },
  VIDEO: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'video';
    baseResult['video'] = contentObj;
    return baseResult;
  },
  NEWS: (baseResult, contentObj) => {
    baseResult['msgtype'] = 'news';
    baseResult['news'] = { 'articles': contentObj['articles'] };
    return baseResult;
  }
};


let pub = {};

/**
 * 构造微信客服消息
 * @param  {[type]} openId     接收者的openId
 * @param  {[type]} replyType  回复消息类型
 * @param  {[type]} contentObj 消息内容
 */
pub.makeCustomMessage = (openId, replyType, contentObj) => {
  return CUSTOM_MESSAGE_FACTORY[replyType](
      {
        "touser": openId,
        "msgtype": ""
      },
      contentObj
  );
};

/**
 * 构造微信客服消息
 * @param  {[type]} openId     接收者的openId
 * @param  {[type]} replyType  回复消息类型
 * @param  {[type]} contentObj 消息内容
 */
pub.makeAutoCustomMessage = (openId, replyType, contentObj) => {
  return AUTO_CUSTOM_MESSAGE_FACTORY[replyType](
      {
        "touser": openId,
        "msgtype": ""
      },
      contentObj
  );
};


/**
 * 发送客服消息
 * @param msgEntity 消息文本
 */
pub.sendCustomMessage = (msgEntity) => {
  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        debug(accessToken);

        return new Promise((resolve) => {
          request(
              {
                uri: getCustomMessageUrl(accessToken),
                method: 'POST',
                json: msgEntity
              },
              (error, response, body) => {
                if (response && response.body && response.body.errcode != 0) {
                  winston.error(response.body);
                  winston.error('[push_alert_error]: %j', msgEntity.touser);

                  return resolve(false);
                } else if (!response || error) {
                  winston.error(error);
                  winston.error('[push_alert_error] no respone: %s', msgEntity.touser);

                  return resolve(false);
                } else {
                  winston.info('[push_alert_success]: %s', msgEntity.touser);

                  return resolve(true);
                }
              })
        });
      });
};

/**
 * 构造并推送TEXT类微信客服消息
 *
 * @param targetUserOpenId
 * @param content
 * @returns {Promise.<T>}
 */
pub.makeAndSendCustomTextMessage = (targetUserOpenId, content) => {
  const customerMessageContent = pub.makeCustomMessage(
      targetUserOpenId,
      enumModel.customizedMsgTypeEnum.TEXT.key,
      { content: content }
  );

  return pub.sendCustomMessage(customerMessageContent);
};

module.exports = pub;

