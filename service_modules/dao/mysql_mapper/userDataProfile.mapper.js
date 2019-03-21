'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const userDataProfileSchema = require('./schema/userDataProfile.schema');

const QUERY_SAFE_PARAMS = ['id', 'userId', 'type', 'rank'];
const QUERY_DEFAULT_SELECT_COLUMNS = ['id', 'userId', 'rank', 'value'];

const getQueryBuilder = (queryParam) => (query) => {
  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
};

const pub = {};

/**
 * 查询一条排行榜
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchByParam = (queryParam) => {
  return userDataProfileSchema.findOne(getQueryBuilder(queryParam));
};

/**
 * 查询所有的排行榜记录
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {
  return userDataProfileSchema.findAll(getQueryBuilder(queryParam), QUERY_DEFAULT_SELECT_COLUMNS, 'rank');
};

module.exports = pub;
