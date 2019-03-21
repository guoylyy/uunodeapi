"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const interactiveGuideChatSchema = require('./schema/interactivGuideChat.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAMS = ['type', 'order'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['order', 'type', 'userId', 'content', 'url', 'userInfo']);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: 'rank', isDescending: false }]);

const pub = {};

pub.queryAll = (queryParam) => {
  return interactiveGuideChatSchema.queryList(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_ORDER_BY);
};

module.exports = pub;
