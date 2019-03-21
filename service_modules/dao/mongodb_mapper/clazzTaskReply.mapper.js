"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const clazzTaskReplySchema = require('./schema/clazzTaskReply.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAMS = ['clazzTask'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['content', 'replayDate', 'toUserId', 'clazzTaskReply', 'fromUserId', 'createdAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'createdAt', isDescending: false }]);

const pub = {};

pub.queryReplyList = (queryParam) => {
  return clazzTaskReplySchema.queryList(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 创建任务回复记录
 *
 * @param replyItem
 * @returns {*|Promise.<TResult>|Promise}
 */
pub.create = (replyItem) => {
  return clazzTaskReplySchema.createItem(replyItem);
};

module.exports = pub;
