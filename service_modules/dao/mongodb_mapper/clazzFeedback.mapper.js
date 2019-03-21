"use strict";

/**
 * clazz数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const clazzFeedbackSchema = require('./schema/clazzFeedback.schema');
const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const QUERY_SAFE_PARAM_LIST = ['status', '_id', 'userId', 'clazz'];

const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['userId', 'status', 'clazz', 'feedbackRound']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);
const UPDATE_SAFE_PARAM_LIST = ['status', 'feedbackRound', 'latestAlertAt']; // 限制可更新的字段

const pub = {};

/**
 * 分页查询笃师一对一反馈列表
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.pagedQuery = (queryParam, pageNumber = 1, pageSize = 10) => {
  return clazzFeedbackSchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY);
};

/**
 * 查询笃师一对一反馈列表
 *
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return clazzFeedbackSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * @param feedbackId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (feedbackId) => {
  return clazzFeedbackSchema.findItemById(feedbackId);
};

/**
 * 新建课程反馈条目
 *
 * @param feedbackItem
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.create = (feedbackItem) => {
  return clazzFeedbackSchema.createItem(feedbackItem);
};

/**
 * 根据id更新反馈状态
 *
 * @param feedbackId
 * @param feedbackItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (feedbackId, feedbackItem) => {
  const pickedCheckinItem = mongoUtil.pickUpdateParams(feedbackItem, UPDATE_SAFE_PARAM_LIST);

  debug(feedbackId, pickedCheckinItem);

  return clazzFeedbackSchema.updateItemById(feedbackId, pickedCheckinItem);
};

module.exports = pub;
