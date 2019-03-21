'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const clazzFeedbackRecordSchema = require('./schema/clazzFeedbackRecord.schema');

const QUERY_SELECT_COLUMNS = ['id', 'userId', 'clazzId', 'teacherUserId', 'status'];

const SAFE_UPDATE_FIELDS = ['id', 'status'];

const getQueryBuilder = (queryParam) => (query) => {
  const QUERY_SAFE_PARAMS = ['id', 'userId', 'clazzId', 'teacherUserId', 'status'];

  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
};

const pub = {};

/**
 * 创建笃师反馈记录
 *
 * @param clazzFeedbackRecordItem
 * @returns {*}
 */
pub.create = (clazzFeedbackRecordItem) => {
  // 参数检查
  if (!_.isPlainObject(clazzFeedbackRecordItem) || !_.isNil(clazzFeedbackRecordItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(clazzFeedbackRecordItem);

  return clazzFeedbackRecordSchema.create(clazzFeedbackRecordItem);
};

/**
 * 根据属性获取一个笃师反馈记录
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchByParam = (queryParam) => {
  return clazzFeedbackRecordSchema.findOne(getQueryBuilder(queryParam));
};

/**
 * 根据属性获取笃师反馈记录列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {
  return clazzFeedbackRecordSchema.findAll(getQueryBuilder(queryParam), QUERY_SELECT_COLUMNS);
};

/**
 * 更新信息
 *
 * @param clazzFeedbackRecordItem
 * @returns {*}
 */
pub.update = (clazzFeedbackRecordItem) => {
  if (!_.isPlainObject(clazzFeedbackRecordItem) || _.isNil(clazzFeedbackRecordItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  const pickedItem = _.pick(clazzFeedbackRecordItem, SAFE_UPDATE_FIELDS);
  debug(pickedItem);

  return clazzFeedbackRecordSchema.update(pickedItem);
};

module.exports = pub;
