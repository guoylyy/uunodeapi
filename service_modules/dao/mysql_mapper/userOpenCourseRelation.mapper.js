'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');

const userOpenCourseRelationSchema = require('./schema/userOpenCourseRelation.schema');

const QUERY_SAFE_PARAMS = ['openCourseId', 'userId', 'status'];
const QUERY_SELECT_COLUMNS = ['openCourseId', 'userId', 'status'];

const pub = {};

/**
 *  新建公开课用户关联关系
 *
 * @param userEasemobRelationItem
 * @returns {*}
 */
pub.create = (userEasemobRelationItem) => {
  // 参数检查
  if (!_.isPlainObject(userEasemobRelationItem) || _.isNil(userEasemobRelationItem.userId) ||
      _.isNil(userEasemobRelationItem.openCourseId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(userEasemobRelationItem);

  return userOpenCourseRelationSchema.create(userEasemobRelationItem);
};

/**
 * 根据属性获取一个第三方用户
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchByParam = (queryParam) => {
  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
  };

  return userOpenCourseRelationSchema.findOne(queryBuilder);
};

/**
 * 根据属性获取第三方用户列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {
  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return userOpenCourseRelationSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

module.exports = pub;
