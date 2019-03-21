'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const clazzTeacherClazzesSchema = require('./schema/clazzTeacherClazzes.schema');


const QUERY_SAFE_PARAMS = ['clazzTeacherId'];
const QUERY_SELECT_COLUMNS = ['id', 'clazzId', 'clazzTeacherId', 'studentCount'];

const pub = {};

/**
 * 创建笃师与课程关联关系
 *
 * @param teacherClazzItem
 * @returns {*}
 */
pub.create = (teacherClazzItem) => {
  // 参数检查
  if (!_.isPlainObject(teacherClazzItem) || !_.isNil(teacherClazzItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(teacherClazzItem);

  return clazzTeacherClazzesSchema.create(teacherClazzItem);
};

/**
 * 根据属性获取笃师课程列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {

  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return clazzTeacherClazzesSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

/**
 * 根据id更新笃师与课程关联关系
 *
 * @param teacherClazzItem
 * @returns {*}
 */
pub.updateById = (teacherClazzItem) => {
  // 参数检查
  if (!_.isPlainObject(teacherClazzItem) || _.isNil(teacherClazzItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(teacherClazzItem);

  return clazzTeacherClazzesSchema.update(teacherClazzItem);
};

module.exports = pub;
