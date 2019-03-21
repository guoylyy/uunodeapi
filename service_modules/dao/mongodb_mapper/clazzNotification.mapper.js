"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');

const clazzNotificationSchema = require('./schema/clazzNotification.schema');

const QUERY_SAFE_PARAM_LIST = ['clazz'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['clazz', 'clazzJoinStatus', 'title', 'success', 'fail', 'pushAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'pushAt', isDescending: true }]);

const pub = {};

/**
 * 暴露create方法
 *
 * @param clazzWithdrawItem
 */
pub.create = (clazzWithdrawItem) => {
  return clazzNotificationSchema.createItem(clazzWithdrawItem);
};

/**
 * 暴露fetchById方法
 *
 * @param clazzWithdrawId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (clazzWithdrawId) => {
  return clazzNotificationSchema.findItemById(clazzWithdrawId);
};

/**
 * 分页获取班级退款列表
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.pagedQuery = (queryParam, pageNumber = 1, pageSize = 10) => {
  debug(queryParam);
  debug(pageNumber);
  debug(pageSize);

  return clazzNotificationSchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY);
};

module.exports = pub;
