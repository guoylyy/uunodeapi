'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const clazzActivityAccountSchema = require('./schema/clazzActivityAccount.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAM_LIST = ['clazz', 'userId', 'version', 'clazzActivityRoom'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['clazz', 'userId', 'status', 'introduction', 'gender', 'version', 'partnerRequired', 'clazzActivityRoom']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'createdAt', isDescending: true }]);

const pub = {};

/**
 * 创建活动账户信息
 *
 * @param activityAccountItem
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.create = (activityAccountItem) => {
  debug(activityAccountItem);

  return clazzActivityAccountSchema.createItem(activityAccountItem);
};

/**
 * 根据查询参数获取活动账户信息
 *
 * @param queryParams
 * @returns {Promise.<TResult>}
 */
pub.fetchByParams = (queryParams) => {
  debug(queryParams);

  return clazzActivityAccountSchema.findItemByParam(queryParams, QUERY_SAFE_PARAM_LIST, QUERY_SORT_BY);
};

/**
 * 根据id更新活动账户信息
 *
 * @param id
 * @param activityAccountItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (id, activityAccountItem) => {
  debug(id);
  debug(activityAccountItem);

  return clazzActivityAccountSchema.updateItemById(id, activityAccountItem);
};

/**
 * 查询互动账户列表信息
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryActivityAccountList = (queryParam) => {
  return clazzActivityAccountSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 根据id获取活动账户信息
 *
 * @param activityAccountId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (activityAccountId) => {
  return clazzActivityAccountSchema.findItemById(activityAccountId);
};

module.exports = pub;
