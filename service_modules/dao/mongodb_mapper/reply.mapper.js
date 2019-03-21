"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const replySchema = require('./schema/reply.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAMS = ['name'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['name', 'replyType', 'content']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

const pub = {};

/**
 * 查询回复列表
 *
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return replySchema.queryList(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

module.exports = pub;
