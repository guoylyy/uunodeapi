'use strict';
/**
 * 模版消息服务类
 */

const _ = require('lodash');
const debug = require('debug')('lib');
const moment = require('moment');
const winston = require('winston');
const request = require('request');

const systemConfig = require('../../config/config');

const wechatAuth = require('./wechat.auth');

const templateReplyService = require('../services/templateReply.service');
const pushFailLogService = require('../services/pushFailLog.service');

const clazzUtil = require('../services/util/clazz.util');
const userBindUtil = require('../services/util/userBind.util');

// 构造模版消息
const constructTemplateMsg = (key, openId, content, url, miniProgram) => {
  return templateReplyService.fetchTemplateByName(key)
      .then((template) => {
        debug(template);
        if (_.isNil(template)) {
          return null;
        }

        const data = {
          "touser": openId,
          "template_id": template.templateId,
          "url": "",
          "data": template.content
        };

        // 设置转至小程序所需数据
        if (_.isPlainObject(miniProgram)) {
          data.miniprogram = {
            appid: miniProgram.appid,       // 跳转到的小程序appid
            pagepath: miniProgram.pagepath  // 跳转到小程序的具体页面路径，支持带参数
          };
        }

        debug(data);
        //设置url
        const urlConfig = template.urlConfig;
        if (urlConfig.passInProgram) {
          data.url = url;
        } else {
          data.url = urlConfig.baseUrl;
        }

        debug(data);
        //设置data
        const keyStr = template.keys;
        if (keyStr && keyStr.length > 0) {
          _.forEach(_.split(keyStr, ','), (key) => {
            data.data[key] = _.extend(
                data.data[key],
                {
                  value: content[key]
                }
            );
          })
        }

        debug(data);
        return data;
      });
};


const compiledTemplateMessageUrl = _.template('https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${ token }');

/**
 * 发送模板信息

 * @param template  发送的模板
 * @param token     这一时间段的token
 * @param resend    是否记录到pushFailLog  true or false;
 * @param clazzId   非必须，用于记录
 * @param userId    非必须，用于记录
 * @param postId    非必须，用于记录
 * @returns {Promise}
 */
const postTemplateWithToken = (template, token, resend, clazzId, userId, postId) => {
  const options = {
    uri: compiledTemplateMessageUrl({ token: token }),
    method: 'POST',
    json: template
  };

  const createPushFailLog = (template, error) => {
    pushFailLogService.createPushFailLog(
        {
          userId: userId,
          clazzId: clazzId,
          postId: postId,
          template: JSON.stringify(template),
          error: JSON.stringify(error),
          /**
           * errcode为40001（access_token过期）时才重新发送
           *
           * 参考 全局返回码说明 http://mp.weixin.qq.com/wiki/17/fa4e1434e57290788bde25603fa2fcbd.html
           */
          hasResend: error.errcode != 40001
        })
        .catch((error) => {
          winston.error(error);
        });
  };

  debug(options);
  return new Promise((resolve) => {
    request(options, (error, response, body) => {
      debug(error);
      debug(body);
      if (error) {
        winston.error('[push_alert_error]: %s', template.touser);

        if (resend === true) {
          // 保存日志
          createPushFailLog(template, error);
        }

        return resolve(false);
      } else if (response.body && response.body.errcode != 0) {
        winston.error('[push_alert_error]: %s', template.touser);

        if (resend === true) {
          // 保存日志
          createPushFailLog(template, response.body);
        }

        return resolve(false);
      }

      winston.info('[push_alert_success]: %s', template.touser);
      return resolve(true);
    });
  })
};

/**
 * 构建模板消息，并推送
 *
 * @param key
 * @param openId
 * @param content
 * @param url
 * @param miniProgram 跳小程序所需数据
 * @param clazzId   非必填，用于记录
 * @param userId    非必填，用于记录
 * @returns {Promise.<TResult>|Promise}
 */
const constructTemplateAndPush = (key, openId, content, url, miniProgram, clazzId, userId) => {
  let fetchTokenPromise = wechatAuth.requestLocalWechatAccessToken(),
      constructTemplateMsgPromise = constructTemplateMsg(key, openId, content, url, miniProgram);

  return Promise.all([fetchTokenPromise, constructTemplateMsgPromise])
      .then((result) => {
        let token = result[0],
            msgData = result[1];

        debug(token, msgData);
        return postTemplateWithToken(msgData, token, true, clazzId, userId);
      })
};

let pub = {};

/**
 * 发送加入班级成功消息
 *
 * @param user
 * @param clazz
 * @returns {Promise.<T>|Promise}
 */
pub.sendJoinSuccessMsg = (user, clazz) => {
  return constructTemplateAndPush(
      'JOIN_SUCCESS_MSG',
      user.openId,
      {
        keyword1: clazz.name,
        keyword2: user.name
      },
      systemConfig.BASE_URL + '/course/detail/' + clazz.id,
      null,
      clazz.id,
      user.id)
      .catch((error) => {
        winston.error('[send_join_sucess_fail]: %j', error);
      });
};

/**
 * 发送回复消息
 *
 * @param user
 * @param clazz
 */
pub.sendReplySuccessMsg = (user, clazz) => {
  return constructTemplateAndPush(
      'REPLY_SUCCESS_MSG',
      user.openId,
      {
        keyword1: clazz.name,
        keyword2: user.name
      },
      `${ systemConfig.BASE_URL }/course/${ clazz.id }/one`,
      null,
      clazz.id,
      user.id)
      .catch((error) => {
        winston.error('[send_reply_msg_fail]: %j', error);
      });
};

/**
 * 发送优币变动通知模版消息
 *
 * @param user
 * @param coin
 * @param remainCoin
 * @param bizType
 */
pub.sendGambicoinChangeMsg = (user, coin, remainCoin, bizType) => {
  return constructTemplateAndPush(
      'GAMBICOIN_CHANGE',
      user.openId,
      {
        'keyword1': coin + '',
        'keyword2': bizType,
        'keyword3': moment().format('YYYY-MM-DD'),
        'keyword4': remainCoin + ''
      },
      `${ systemConfig.BASE_URL }/me/coin`,
      null,
      null,
      user.id)
      .catch((error) => {
        winston.error('[send_gambi_coin_fail]: %j', error);
      });
};

/**
 * 发送退款模版消息
 *
 * @param  {[type]} user   [description]
 * @param  {[type]} title  [description]
 * @param  {[type]} money  [description]
 * @param  {[type]} remark [description]
 * @param  {[type]} clazzId [description]
 * @return {[type]}        [description]
 */
pub.sendPaybackMsg = (user, title, remark, money, clazzId) => {
  return constructTemplateAndPush(
      'PAYBACK_MSG',
      user.openId,
      {
        'first': title,
        'keyword2': money + '元',
        'remark': remark
      },
      `${ systemConfig.BASE_URL }/me/coin?page=withdraw`,
      null,
      clazzId,
      user.id)
      .catch((error) => {
        winston.error('[send_pay_back_fail]: %j', error);
      });
};

/**
 * 发送打卡记录修改模板消息
 *
 * @param user
 * @param clazz
 * @param remark
 * @returns {Promise.<T>|Promise}
 */
pub.sendCheckinAlertMsg = (user, clazz, remark) => {
  const remarkStr = remark ? `\n备注： ${ remark }` : '';
  return constructTemplateAndPush(
      'CHECKIN_ALERT_MSG',
      user.openId,
      {
        first: '课程打卡提醒',
        keyword1: clazz.name,
        keyword2: user.name,
        remark: `您在${ clazz.name }的打卡记录已经被修改，请进入查看。么么哒～${ remarkStr }`
      },
      `${ systemConfig.BASE_URL }/course/detail/${ clazz.id }?isCheckin=1`,
      null,
      clazz.id,
      user.id)
      .catch((error) => {
        winston.error('[send_join_sucess_fail]: %j', error);
      });
};

/**
 * 发送模板信息
 *
 * @param template 发送的模板
 * @param token 这一时间段的token
 */
pub.postTemplateWithToken = postTemplateWithToken;

/**
 * 发送优惠券模板消息
 *
 * @param user
 * @param content
 * @returns {Promise.<T>|Promise}
 */
pub.sendCouponAlertMsg = (user, content) => {
  return constructTemplateAndPush(
      'COUPON_ALERT_MSG',
      user.openId,
      {
        first: '优惠券提醒',
        keyword1: '优惠券',
        keyword2: user.name,
        remark: content
      },
      `${ systemConfig.BASE_URL }/me/ticket`,
      null,
      '',
      user.id)
      .catch((error) => {
        winston.error('[send_coupon_alert_fail]: %j', error);
      });
};


/**
 * 发送复活卡提醒
 *
 * @param user
 * @param content
 * @returns {Promise.<T>|Promise}
 */
pub.sendUbandCardAlertMsg = (user, content) => {
  return constructTemplateAndPush(
      'COUPON_ALERT_MSG',
      user.openId,
      {
        first: '复活卡提醒',
        keyword1: '复活卡',
        keyword2: user.name,
        remark: content
      },
      `${ systemConfig.BASE_URL }/me/ticket`,
      null,
      '',
      user.id)
      .catch((error) => {
        winston.error('[send_coupon_alert_fail]: %j', error);
      });
};


/**
 * 发送回复消息跳转至小程序
 *
 * @param clazz
 * @param receiver
 * @param sender
 * @param receiverBind
 * @param senderBind
 * @returns {Promise.<T>|Promise}
 */
pub.sendReplySuccessRedirectToMiniProgramMsg = (clazz, receiver, sender, receiverBind, senderBind) => {
  const checkIsClazzTeacher = clazzUtil.checkIsClazzTeacher(clazz);

  // 构造页面参数
  const usernameParams = {
    clazzId: clazz.id,
    iTeacher: checkIsClazzTeacher(receiver.openId),
    myName: receiverBind.accountName,
    uTeacher: checkIsClazzTeacher(sender.openId),
    your: senderBind.accountName,
    yourImage: sender.headImgUrl,
    yourName: sender.name,
  };

  return constructTemplateAndPush(
      'REPLY_SUCCESS_MSG_MINIPROGRAM',
      receiver.openId,
      {
        keyword1: clazz.name,
        keyword2: receiver.name
      },
      null,
      {
        appid: systemConfig.WEAPP_ONE_CONFIG.APP_ID,
        pagepath: `pages/chatroom/chatroom?username=${ JSON.stringify(usernameParams) }`
      },
      clazz.id,
      receiver.id)
      .catch((error) => {
        winston.error('[send_reply_msg_fail]: %j', error);
      });
};

/**
 * 推送模板消息
 *
 * @param templateMessage
 * @param resend
 * @param clazzId
 * @param userId
 * @returns {*}
 */
pub.pushTemplateMessage = (templateMessage, resend, clazzId, userId) => {
  // 如果推送列表为null，则直接返回
  if (_.isNil(templateMessage)) {
    return Promise.resolve(defaultCountMap);
  }

  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        debug(accessToken);

        return postTemplateWithToken(templateMessage, accessToken, resend, clazzId, userId)
      });
};

/**
 * 推送模板消息列表，不重发
 *
 * @param templateMessageList
 * @returns {Promise.<TResult>}
 */
pub.pushTemplateMessageList = (templateMessageList) => {
  const defaultCountMap = {
    true: 0,
    false: 0
  };

  // 如果推送列表为空，则直接返回
  if (_.isEmpty(templateMessageList)) {
    return Promise.resolve(defaultCountMap);
  }

  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        const pushMessagePromiseList = _.map(templateMessageList, (messageItem) => {
          return postTemplateWithToken(messageItem, accessToken, false);
        });

        return Promise.all(pushMessagePromiseList);
      })
      .then((results) => {
        debug(results);

        const countMap = _.extend(
            {},
            defaultCountMap,
            _.countBy(results)
        );

        winston.info('[push_template_message_success_count] : %s', countMap[true]);
        winston.info('[push_template_message_fail_count] : %s', countMap[false]);

        return countMap;
      })
};

module.exports = pub;
