'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const winston = require('winston');
const debug = require('debug')('mapper');

const bookshelf = require('../mysql.connection');

const queryUtil = require('../util/queryUtil');
const pushFailLogSchema = require('./schema/pushFailLog.schema');

const PushFailLogCollection = bookshelf.Collection.extend({ model: pushFailLogSchema });

/**
 * 处理PushFailLog中的字段
 * 1. template -> JSON.parse
 * 2. error -> JSON.parse
 * 3. hasResend -> 0: false, 1: true
 *
 * @param failLog
 * @returns {*}
 */
let parseFields = (failLog) => {
  if (_.isNil(failLog)) {
    return failLog;
  }

  if (!_.isNil(failLog.template)) {
    failLog.template = JSON.parse(failLog.template);
  }

  if (!_.isNil(failLog.error)) {
    failLog.error = JSON.parse(failLog.error);
  }

  if (!_.isNil(failLog.hasResend)) {
    failLog.hasResend = (failLog.hasResend !== 0);
  }

  debug(failLog);

  return failLog;
};

let pub = {};

const QUERY_SAFE_PARAMS = ['id', 'clazzId', 'postId', 'hasResend'];
const DEFAULT_SELECT_COLUMNS = ['id', 'userId', 'clazzId', 'postId', 'template', 'hasResend'];

/**
 * 查询推送失败记录列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPushFailLogs = (queryParam) => {

  return pushFailLogSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
      .orderBy('updatedAt', 'desc')
      .fetchAll({ columns: DEFAULT_SELECT_COLUMNS })
      .then((pushFailLogList) => {
            debug(pushFailLogList);

            return _.map(pushFailLogList.toJSON(), parseFields);
          }
      );
};

/**
 * 新建推送失败记录
 *
 * @param pushFailLogItem
 * @returns {*}
 */
pub.create = (pushFailLogItem) => {
  if (!_.isPlainObject(pushFailLogItem) || !_.isNil(pushFailLogItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }
  debug(pushFailLogItem);

  return pushFailLogSchema.forge(pushFailLogItem)
      .save(null, {
        method: 'insert'
      })
      .then((pushFailLogItem) => {
        debug('Created pushFailLog: %j', pushFailLogItem);

        return parseFields(pushFailLogItem.toJSON());
      })
};

const UPDATE_SAFAE_FIELDS = ['id', 'hasResend'];
/**
 * 更新列表
 *
 * @param pushFailLogList
 * @returns {*}
 */
pub.update = (pushFailLogList) => {
  if (!_.isArray(pushFailLogList)) {
    return Promise.reject(new Error('参数错误'));
  }

  let pickedList = [];
  for (let i = 0, length = pushFailLogList.length; i < length; ++i) {
    let pushFailLogItem = pushFailLogList[i];

    if (!_.isPlainObject(pushFailLogItem) || _.isNil(pushFailLogItem.id)) {
      return Promise.reject(new Error('参数错误'));
    }

    // 过滤字段
    pickedList.push(_.pick(pushFailLogItem, UPDATE_SAFAE_FIELDS));
  }

  if (_.isEmpty(pickedList)) {
    return Promise.resolve(pickedList);
  }

  return PushFailLogCollection.forge(pickedList)
      .invokeThen('save')
      .then((updatedList) => {
        debug(updatedList);

        return _.map(updatedList, (logItem) => parseFields(logItem.toJSON()));
      });
};

module.exports = pub;
