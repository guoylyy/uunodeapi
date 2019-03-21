"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const clazzRolePlaySchema = require('./schema/clazzRolePlay.schema');

const QUERY_SAFE_PARAM_LIST = ['clazz', 'targetDate', 'isDelete'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['title', 'targetDate', 'fileSize', 'updatedAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'targetDate', isDescending: true }]);

const pub = {};

/**
 * 暴露create方法
 *
 * @param openCourseItem
 */
pub.create = (openCourseItem) => {
  return clazzRolePlaySchema.createItem(openCourseItem);
};

/**
 * 暴露 updateItemById 方法
 *
 * @param clazzPlayId
 * @param openCourseItem
 * @returns {Promise.<TResult>}
 */
pub.update = (clazzPlayId, openCourseItem) => {
  return clazzRolePlaySchema.updateItemById(clazzPlayId, openCourseItem);
};

/**
 * 暴露fetchById方法
 *
 * @param clazzPlayId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (clazzPlayId) => {
  return clazzRolePlaySchema.findItemById(clazzPlayId);
};

/**
 * 暴露 queryAll 方法
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryAll = (queryParam) => {
  return clazzRolePlaySchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 移除item
 *
 * @param clazzPlayId
 * @returns {Promise.<TResult>}
 */
pub.deleteById = (clazzPlayId) => {
  debug(clazzPlayId);

  return clazzRolePlaySchema.destroyItem(clazzPlayId);
};

/**
 * 分页查询
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPaged = (queryParam, pageNumber = 1, pageSize = 10) => {
  return clazzRolePlaySchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY);
};

module.exports = pub;
