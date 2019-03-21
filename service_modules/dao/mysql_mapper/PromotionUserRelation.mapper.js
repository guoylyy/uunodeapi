'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const promotionUserRelationSchema = require('./schema/promotionUserRelation.schema');


const QUERY_SAFE_PARAMS = ['id', 'promoterUserId', 'inviteeUserId', 'type'];
const QUERY_SELECT_COLUMNS = ['id', 'inviteeUserId', 'type'];

const filterQueryParam = (queryParam) => (query) => {
  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
};

const pub = {};

/**
 * 创建新的条目
 *
 * @param userBindItem
 * @returns {*}
 */
pub.create = (userBindItem) => {
  // 参数检查
  if (!_.isPlainObject(userBindItem) || !_.isNil(userBindItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(userBindItem);

  return promotionUserRelationSchema.create(userBindItem);
};

/**
 * 获取单个项目
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchOneByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return promotionUserRelationSchema.findOne(queryBuilder);
};

/**
 * 获取列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchAllByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return promotionUserRelationSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

module.exports = pub;
