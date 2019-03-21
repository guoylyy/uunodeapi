"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const queryUtil = require('../util/queryUtil');

const clazzStatSchema = require('./schema/clazzStat.schema');

const QUERY_SAFE_PARAM_LIST = ['clazz', 'targetTime','createdAt'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['checkinCount', 'checkinRate', 'updatedAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

const pub = {};

/**
 * 根据参数获取单个条目
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.fetchByParam = (queryParam) => {
  return clazzStatSchema.findItemByParam(queryParam, QUERY_SAFE_PARAM_LIST);
};

/**
 * 查询列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.fetchAll = (queryParam) => {
  return clazzStatSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

module.exports = pub;
