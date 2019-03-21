"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const queryUtil = require('../util/queryUtil');

const clazzWithdrawSchema = require('./schema/clazzWithdraw.schema');

const QUERY_SAFE_PARAM_LIST = ['clazz'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['clazz', 'startDate', 'endDate', 'checkinRate', 'totalWithdrawMoney']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

const pub = {};

/**
 * 暴露query方法
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return clazzWithdrawSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 暴露create方法
 *
 * @param clazzWithdrawItem
 */
pub.create = (clazzWithdrawItem) => {
  return clazzWithdrawSchema.createItem(clazzWithdrawItem);
};

/**
 * 暴露update方法
 *
 * @param clazzWithdrawId
 * @param clazzWithdrawItem
 * @returns {Promise.<TResult>}
 */
pub.update = (clazzWithdrawId, clazzWithdrawItem) => {
  return clazzWithdrawSchema.updateItemById(clazzWithdrawId, clazzWithdrawItem);
};

/**
 * 暴露fetchById方法
 *
 * @param clazzWithdrawId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (clazzWithdrawId) => {
  return clazzWithdrawSchema.findItemById(clazzWithdrawId);
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
  return clazzWithdrawSchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY);
};

module.exports = pub;
