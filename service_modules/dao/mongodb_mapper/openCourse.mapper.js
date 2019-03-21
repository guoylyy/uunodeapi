"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const queryUtil = require('../util/queryUtil');

const openCourseSchema = require('./schema/openCourse.schema');

const QUERY_SAFE_PARAM_LIST = [];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['logo', 'name', 'author', 'status', 'openDate', 'isSticked']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'openDate', isDescending: true }]);

const pub = {};

/**
 * 暴露create方法
 *
 * @param openCourseItem
 */
pub.create = (openCourseItem) => {
  return openCourseSchema.createItem(openCourseItem);
};

/**
 * 暴露 updateItemById 方法
 *
 * @param openCourseId
 * @param openCourseItem
 * @returns {Promise.<TResult>}
 */
pub.update = (openCourseId, openCourseItem) => {
  return openCourseSchema.updateItemById(openCourseId, openCourseItem);
};

/**
 * 暴露fetchById方法
 *
 * @param openCourseId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (openCourseId) => {
  return openCourseSchema.findItemById(openCourseId);
};

/**
 * 暴露 queryAll 方法
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryAll = (queryParam) => {
  return openCourseSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

module.exports = pub;
