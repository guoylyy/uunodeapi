'use strict';

const _ = require('lodash');
const debug = require('debug')('component');
const Promise = require('bluebird');
const winston = require('winston');

const JPush = require('jpush-sdk');

const systemConfig = require('../../../config/config');

const client = JPush.buildClient({
  appKey: _.get(systemConfig, ['JPUSH_SDK_CONFIG', 'APP_KEY'], ''),
  masterSecret: _.get(systemConfig, ['JPUSH_SDK_CONFIG', 'MASTER_SECRET'], ''),
  retryTimes: _.get(systemConfig, ['JPUSH_SDK_CONFIG', 'RETRY_TIMES'], 0),
  isDebug: global.IS_DEVLOPMENT_ENVIRONMENT
});

const pub = {};

/**
 * 封装的课程任务极光推送
 *
 * @param clazzId       班级id
 * @param postType      推文类型
 * @param postTarget    推文目标
 * @param title         消息title
 * @param postId        消息id
 * @param message       消息内容
 */
pub.pushClazzTask = (clazzId, postType, postTarget, title, postId, message) => {
  return new Promise((resolve, reject) => {
    const extra = {
      type: 'CLAZZ_TASK',
      clazzId: clazzId,
      postType: postType,
      postTarget: postTarget,
      postId: postId
    };

    client.push()
        .setPlatform(JPush.ALL)
        .setAudience(JPush.tag(clazzId))
        .setNotification(
            title,
            JPush.android(message, title, null, extra),
            JPush.ios(message, 'sound', null, false, extra)
        )
        .setOptions(null, null, null, global.IS_DEVLOPMENT_ENVIRONMENT === false, null, null)
        .send((error, res) => {
          if (!_.isNil(error)) {
            winston.error(error);

            return reject(error);
          }
          debug('Sendno: ' + res.sendno);
          debug('Msg_id: ' + res.msg_id);

          return resolve(res);
        });
  })
};

module.exports = pub;
