'use strict';

const _ = require('lodash');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const pushFailLogMapper = require('../dao/mysql_mapper/pushFailLog.mapper');

let pub = {};

/**
 * 新建关闭推送失败记录
 *
 * @param pushFailLogItem
 * @returns {*}
 */
pub.createPushFailLog = (pushFailLogItem) => {
  if (!_.isPlainObject(pushFailLogItem) || !_.isNil(pushFailLogItem.id)) {
    winston.error('新建pushFailLog失败，参数错误！！！ pushFailLogItem: %j', pushFailLogItem);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  return pushFailLogMapper.create(pushFailLogItem);
};

/**
 * 查询所有未重发过的推送失败记录
 *
 * @returns {Promise.<TResult>|Promise}
 */
pub.listUnresendMessages = () => {
  return pushFailLogMapper.queryPushFailLogs({ hasResend: false })
};

/**
 * 标记ids列表为已重发
 *
 * @param ids
 * @returns {*}
 */
pub.markPushFailLogsResended = (ids) => {
  if (!_.isArray(ids)) {
    winston.error('标记pushFailLog列表为已发送失败，参数错误！！！ ids: %j', ids);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  if (_.isEmpty(ids)) {
    return Promise.resolve(ids);
  }

  debug(ids);

  let resendLogs = _.map(ids, (id) => {
    return {
      id: id,
      hasResend: true,
    }
  });

  return pushFailLogMapper.update(resendLogs);
};

module.exports = pub;
