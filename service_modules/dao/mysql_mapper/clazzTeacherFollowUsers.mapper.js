'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const clazzTeacherFollowUsersSchema = require('./schema/clazzTeacherFollowUsers.schema');


const QUERY_SAFE_PARAMS = ['clazzTeacherId', 'userId'];
const QUERY_SELECT_COLUMNS = ['id', 'userId', 'clazzTeacherId', 'followAt'];

const pub = {};

/**
 * 创建笃师与课程关联关系
 *
 * @param followUsersItem
 * @returns {*}
 */
pub.create = (followUsersItem) => {
  // 参数检查
  if (!_.isPlainObject(followUsersItem) || !_.isNil(followUsersItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(followUsersItem);

  return clazzTeacherFollowUsersSchema.create(followUsersItem);
};

/**
 * 根据属性获取笃师关注用户户列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {

  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return clazzTeacherFollowUsersSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

module.exports = pub;
