"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const templateReplySchema = require('./schema/templateReply.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

const QUERY_SAFE_PARAMS = ['name'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['name', 'templateId', 'content', 'urlConfig', 'keys']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

/**
 * 查询满足条件回复模板列表
 *
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return templateReplySchema.queryList(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

module.exports = pub;
