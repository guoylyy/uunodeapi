"use strict";

/**
 * clazz数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const clazzFeedbackReplySchema = require('./schema/clazzFeedbackReply.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAM_LIST = ['userId', 'clazzFeedback', 'clazz', 'createdAt'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['replyType', 'userId', 'adminId', 'clazzFeedback', 'content', 'attach', 'feedbackMaterial', 'createdAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'createdAt', isDescending: true }]);

const pub = {};

/**
 * 查询笃师一对一反馈回复消息列表
 *
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.queryAll = (queryParam) => {
  return clazzFeedbackReplySchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 分页查询笃师一对一反馈消息列表
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.pagedQuery = (queryParam, pageNumber = 1, pageSize = 10) => {
  return clazzFeedbackReplySchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY);
};

/**
 * 创建任务回复记录
 *
 * @param replyItem
 * @returns {*|Promise.<TResult>|Promise}
 */
pub.create = (replyItem) => {
  return clazzFeedbackReplySchema.createItem(replyItem);
};

/**
 * 获取满足条件的最新反馈消息
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryLatestFeedback = (queryParam) => {
  return clazzFeedbackReplySchema.findItemByParam(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SORT_BY);
};

module.exports = pub;
