'use strict';

/**
 * coupon数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const clazzExitSchema = require('./schema/clazzExit.schema');
const queryUtil = require('../util/queryUtil');

// 常量： 安全查询参数；用于限制查询时的参列表
const QUERY_SAFE_PARAMS = ['id', 'clazzId', 'userId', 'clazzAccountId', 'status', 'applyDate', 'userReason', 'remark'];
// 常量： 查询结果；用于在列表结果中过滤非必要参数
const QUERY_SELECT_COLUMNS = ['id', 'clazzId', 'userId', 'status', 'userReason', 'remark'];
// 常量： 可更新信息
const SAFE_UPDATE_FIELDS = ['id', 'status', 'realUserCoins', 'userCoinId', 'remark'];

const pub = {};

/**
 * 新建退班记录
 *
 * @param clazzExit
 * @returns {*}
 */
pub.createClazzExit = (clazzExit) => {
  if (!_.isPlainObject(clazzExit) || !_.isNil(clazzExit.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  return clazzExitSchema.create(clazzExit);
};

/**
 * 分页查询退班记录
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*}
 */
pub.queryPagedClazzExits = (queryParam, pageNumber = 1, pageSize = 10) => {
  if (!_.isPlainObject(queryParam) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(new Error('参数错误'));
  }

  const queryBuilder = (query) => queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);

  return clazzExitSchema.fetchPagedAll(queryBuilder, QUERY_SELECT_COLUMNS, pageNumber, pageSize);
};

/**
 * 根据参数获取退班记录
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchClazzExitByParam = (queryParam) => {
  if (!_.isPlainObject(queryParam)) {
    return Promise.reject(new Error('参数错误'));
  }

  const queryBuilder = (query) => queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);

  return clazzExitSchema.findOne(queryBuilder);
};

/**
 * 更新退班记录
 *
 * @param clazzExit
 * @returns {*}
 */
pub.updateClazzExit = (clazzExit) => {
  if (!_.isPlainObject(clazzExit) || _.isNil(clazzExit.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  const pickeClazzExit = _.pick(clazzExit, SAFE_UPDATE_FIELDS);
  debug(pickeClazzExit);

  return clazzExitSchema.update(pickeClazzExit);
};

module.exports = pub;
