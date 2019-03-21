"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const meatySharingSchema = require('./schema/meatySharing.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAMS = ['_id'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['_id', 'name', 'url', 'readCount', 'shareAt']);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: 'shareAt', isDescending: true }]);

const pub = {};

/**
 * 分页列出干货分享
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedClazzTeacherCommendList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return meatySharingSchema.queryPaged(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_ORDER_BY);
};

/**
 * 新建笃师的干货分享
 *
 * @param commendItem
 */
pub.create = (commendItem) => {
  return meatySharingSchema.createItem(commendItem);
};

module.exports = pub;
