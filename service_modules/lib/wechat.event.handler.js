'use strict';
/**
 * 微信sdk签名工具
 * @returns {string}
 */
const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('lib');
const winston = require('winston');

const systemConfig = require('../../config/config');
const enumModel = require('../services/model/enum');

const wechatReply = require('./wechat.reply');
const wechatUser = require('./wechat.user');
const wechatCustomMessage = require('./wechat.custom.message');
const wechatPromotion = require('./wechat.promotion');

const userService = require('../services/user.service');
const clazzPostService = require('../services/post.service');

const clazzUtil = require('../services/util/clazz.util');

const IMAGE_URL = 'https://mmbiz.qlogo.cn/mmbiz_png/0icicZvlEv6DaOLSAsGlfNUiblTCuoIRD7YS4WDeYukZyLE5a9VS6LY7wj4M1udkClrXM2t99b5wnB4taUZiaIXjyw/0?wx_fmt=png';
/**
 * 获取用户今日任务
 *
 * @param baseResult
 * @param loginInfo
 * @returns {Promise.<TResult>}
 */
const fetchUserTodayTasks = (baseResult, loginInfo) => {
  // 推送当天课程任务给学员
  return clazzPostService.fetchUserTodayPostList(loginInfo.account.id)
      .then((postList) => {
        debug(postList);

        const taskCount = _.size(postList);

        // 如果用户当天课程任务不为空，则推送之
        if (taskCount > 0) {
          const articles = _.map(postList, (clazzPost) => {
            const url = (clazzPost.postType === enumModel.postTypeEnum.CLAZZ_TASK.key)
                ? clazzUtil.getClazzTaskUrl(clazzPost.clazzId, clazzPost.target, clazzPost.id)
                : systemConfig.target;

            return {
              "title": clazzPost.title,
              "description": clazzPost.title,
              "url": url,
              "picurl": IMAGE_URL
            };
          });

          _.chain(articles)
              .chunk(5)
              .map((articleList) => {
                const messageContent = wechatCustomMessage.makeCustomMessage(loginInfo.openId, "NEWS", {articles: articleList});
                debug(messageContent);

                // 推送客服消息
                return wechatCustomMessage.sendCustomMessage(messageContent);
              })
              .value();
        }

        return taskCount;
      })
      .then((count) => {
        if (count === 0) {
          baseResult.xml.Content = '未获取到任何任务';
        } else {
          baseResult.xml.Content = '获取今日任务成功';
        }

        return baseResult;
      })
};

/**
 * 老师点评服务
 * @param baseResult
 * @param loginInfo
 */
let fetchTeachTodayTasks = (baseResult, loginInfo) => {
  // todo 获取笃师正在进行中的qa
  return Promise.resolve(null)
      .then((qaItem) => {
        if (qaItem == null) {
          //1. todo 给教师发送一个任务
          return Promise.resolve(null)
              .then((qaObj) => {
                if (qaObj == null) {
                  baseResult.xml.Content = '好像暂时没有更多的任务了..';
                } else {
                  baseResult.xml.Content = '为你分配了一个任务..';
                }

                return baseResult;
              });
        }

        let answer = qa.answers;
        if (answer && answer.fileIds && answer.fileIds.length > 0) {
          // todo 推送消息给学员

          qa.status = enumModel.qaStatusEnum.COMPLETED.key;
          qa.answerTime = new Date();

          // todo 保存点评item
          return Promise.resolve(qaItem)
              .then((qaItem) => {
                baseResult.xml.Content = '提交点评成功~真棒!';

                return baseResult;
              });

        }

        baseResult.xml.Content = '你还没有发送点评诶亲~';
        // todo 开始点评
        return baseResult;
      })
};

/**
 * 点击事件处理切面
 *
 * @param eventKey
 * @param loginInfo
 * @param baseResult
 */
let clickAspect = (eventKey, loginInfo, baseResult) => {
  return new Promise((resolve) => {
    if (eventKey === 'TEMPLATESENDJOBFINISH') {
      baseResult.xml.Content = 'success';

      return resolve([false, baseResult]);
    }

    return resolve([true, baseResult]);
  });
};

/**
 * 点击后置事件处理切面
 *
 * @param eventKey
 * @param loginInfo
 * @param baseResult
 */
let clickEndAspect = (eventKey, loginInfo, baseResult) => {
  if (eventKey === 'TODAYTASKS') {

    return fetchUserTodayTasks(baseResult, loginInfo)
        .then((baseResult) => {
          return [false, baseResult]
        });

  } else if (eventKey === 'CUSTOMER_SERVICE') {
    const processMsg = wechatCustomMessage.makeCustomMessage(
        loginInfo.account.openId,
        "TEXT",
        {
          content: "如果您有任何问题\n请进入下面的渠道提问即可\n传送门:\n " +
          "https://mp.weixin.qq.com/s/VbiVZ37tj0JPmncMPM3sxQ"
        }
    );
    // wechatCustomMessage.sendCustomMessage(imageMsg);

    return new Promise((resolve) => {
      //暂时不转到客服，转到我们的订阅号
      //baseResult.xml.MsgType = 'transfer_customer_service';
      baseResult.xml.Content = "如果您有任何问题(班级、英文、口译、学业？)\n\n请进入下面的渠道提问即可\n传送门:\n " + "https://mp.weixin.qq.com/s/VbiVZ37tj0JPmncMPM3sxQ";
      resolve([false, baseResult]);
    });
  }

  return new Promise((resolve) => {
    resolve([true, baseResult]);
  });
};

/**
 * 点击事件处理器
 *
 * @param eventKey
 * @param loginInfo
 * @param baseResult
 * @returns {Promise.<TResult>|Promise}
 */
let clickEventHandler = (eventKey, loginInfo, baseResult) => {
  // 可用性切面
  return clickAspect(eventKey, loginInfo, baseResult)
      .then((results) => {
        let aspectRc = results[0];
        baseResult = results[1];

        winston.info("clickEventHandler 1: %s", aspectRc);

        if (aspectRc === true) {
          //后置动作，配置相应的后置动作
          return clickEndAspect(eventKey, loginInfo, baseResult);
        } else {
          return Promise.resolve([false, baseResult]);
        }
      })
      .then((results) => {
        let aspectRc = results[0];
        baseResult = results[1];

        winston.info("clickEventHandler 2: %s", aspectRc);

        if (aspectRc === true) {
          return wechatReply.autoReply('EVENT', eventKey, baseResult)
        } else {
          return baseResult;
        }
      });
};

/**
 * 用户注册事件处理器
 *
 * @param openId
 * @param eventKey
 * @param ticket
 * @param baseResult
 * @returns {Promise.<T>}
 */
const subscribeEventHandler = (openId, eventKey, ticket, baseResult) => {
  // 首先查看用户是否已经存在
  return wechatUser.requestUserInfoThenSignUpIfAbsent(openId)
      .then((userItem) => {
        winston.info('[register_subscribe_user]: %s', userItem.id);

        // 仅当eventKey不为空，且 ticket 存在时才触发推广处理事件
        if (!_.isEmpty(eventKey) && !_.isNil(ticket)) {
          // 推广处理切面
          wechatPromotion.promotionRegisterHandler(userItem, eventKey, ticket)
              .catch(winston.error);
        }

        // 更新用户关注状态
        return userService.updateUserItem(userItem.id, {isSubscribe: true});
      })
      .then((updateUserItem) => {
        debug(updateUserItem);
        // 修改消息内容

        return wechatReply.autoReply('MSG', 'subscribe', baseResult)
      })
      .catch((error) => {
        winston.error(error);
        winston.info('[register_subscribe_user_fail]: %s', openId);

        throw error;
      });
};

/**
 * 用户取关事件处理器
 *
 * @param openId
 * @param baseResult
 * @returns {Promise.<T>}
 */
const unsubscribeEventHandler = (openId, baseResult) => {
  return userService.fetchByOpenId(openId)
      .then((userItem) => {
        debug(userItem);
        // 更新用户关注状态
        return userService.updateUserItem(userItem.id, {isSubscribe: false});
      })
      .then((updateUserItem) => {
        debug(updateUserItem);
        // 修改消息内容
        baseResult.xml.Content = 'success';

        return baseResult;
      })
      .catch((error) => {
        winston.error(error);
        winston.info('[register_unsubscribe_user_fail]: %s', openId);

        throw error;
      })
};

/**
 * 微信事件处理器
 *
 * @param msgData
 * @param loginInfo
 * @returns {*}
 */
module.exports = (msgData, loginInfo) => {
  debug(msgData, loginInfo);
  if (_.isNil(msgData.xml.Event)) {
    return null;
  }

  let event = msgData.xml.Event[0],
      eventKey = _.get(msgData, 'xml.EventKey[0]'),
      baseResult = wechatReply.getBaseResult(msgData), //基础消息模板
      openId = baseResult.xml.ToUserName,
      ticket = _.get(msgData, 'xml.Ticket[0]');

  baseResult.xml.MsgType = 'text';

  debug(event);
  debug(eventKey);
  debug(ticket);

  switch (event) {
    case 'CLICK':
      return clickEventHandler(eventKey, loginInfo, baseResult);
    // 处理用户未关注公众号
    case 'subscribe':
      return subscribeEventHandler(openId, eventKey, ticket, baseResult);
    case 'unsubscribe':
      return unsubscribeEventHandler(openId, baseResult);
    case 'TEMPLATESENDJOBFINISH':
      baseResult.xml.Content = 'success';
      break;
    // 处理已关注的用户关注事件
    case 'SCAN':
      if (loginInfo.isTeacher) {
        baseResult.xml.Content = '很遗憾,你不是新用户,不能支持小伙伴哦!';
      } else {
        baseResult.xml.Content = '欢迎把Uband友伴推荐给更多小伙伴哦。';
      }
      break;
    default:
      baseResult.xml.Content = true;
      break;
  }

  return baseResult;
};
