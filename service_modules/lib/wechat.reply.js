'use strict';
/**
 * @author 自动回复类
 * 超级强大的微信回复全系列支持工具类
 */
const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const Promise = require('bluebird');

const replyService = require('../services/reply.service');

const customerMsg = require('./wechat.custom.message');

/**
 * 消息构造工厂
 *
 * @type {{TYPE: function}}
 */
let replyFactory = {
  // 文本消息
  TEXT: (baseResult, contentObj) => {
    baseResult.xml['MsgType'] = 'text';
    baseResult.xml['Content'] = contentObj['Content'];

    return baseResult;
  },
  // 语音消息
  VOICE: (baseResult, contentObj) => {
    baseResult.xml['MsgType'] = 'voice';
    baseResult.xml['Voice'] = {
      'MediaId': contentObj.MediaId
    };

    return baseResult;
  },
  // 图片消息
  IMAGE: (baseResult, contentObj) => {
    baseResult.xml['MsgType'] = 'image';
    baseResult.xml['Image'] = {
      'MediaId': contentObj.MediaId
    };

    return baseResult;
  },
  // 视频消息
  VIDEO: (baseResult, contentObj) => {
    baseResult.xml['MsgType'] = 'video';
    baseResult.xml['Video'] = {
      'MediaId': contentObj.MediaId,
      'Title': contentObj.Title,
      'Description': contentObj.Description
    };

    return baseResult;
  },
  // 图文消息
  NEWS: (baseResult, contentObj) => {
    baseResult.xml['MsgType'] = 'news';
    baseResult['biz'] = 'subscribe';
    delete baseResult['Content'];
    baseResult.xml['ArticleCount'] = Object.keys(contentObj).length - 1;
    baseResult.xml['Articles'] = contentObj;
    return baseResult;
  }
};

let pub = {};

//获取基础的回复对象
pub.getBaseResult = (msg) => {
  return {
    xml: {
      ToUserName: msg.xml.FromUserName[0],
      FromUserName: _.toString(msg.xml.ToUserName),
      CreateTime: _.now()
    }
  };
};

/**
 * 获取微信回复消息类型
 * @param  {[type]} baseResult [description]
 * @param  {[type]} replyType  [description]
 * @param  {[type]} contentObj [description]
 * @return {[type]}            [description]
 */
pub.makeReply = (baseResult, replyType, contentObj) => {
  let replyGenerator = replyFactory[replyType];

  if (_.isNil(replyGenerator) || _.isNil(replyType) || _.isNil(contentObj)) {
    return null;
  }

  return replyGenerator(baseResult, contentObj);
};

/**
 * 自动回复函数
 * @param optType
 * @param key
 * @param baseResult
 */
pub.autoReply = (optType, key, baseResult) => {
  debug(optType, key, baseResult);
  // 读取自动回复配置
  return replyService.queryReplyListStartWithName(key)
      .then((replyList) => {
        debug(replyList);

        if (replyList && replyList.length > 0) {

          if(replyList.length == 1){
            baseResult = pub.makeReply(baseResult, replyList[0].replyType, replyList[0].content);
          }else{
            //回复第一条消息
            baseResult = pub.makeReply(baseResult, replyList[0].replyType, replyList[0].content);

            //构建其他消息的客服消息
            for(let i =1, length = replyList.length; i<length; ++i){
              let item = replyList[i];
              let entity = customerMsg.makeAutoCustomMessage(baseResult.xml.ToUserName, item['replyType'], item['content']);
              customerMsg.sendCustomMessage(entity);
            }
          }
        }
        console.log(baseResult);
        debug(baseResult);

        return baseResult;
      })
      .catch((error) => {
        winston.error(error);
        return baseResult;
      });
};


//导出
module.exports = pub;
