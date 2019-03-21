'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const queryUtil = require('../util/queryUtil');
const systemConfigSchema = require('./schema/systemConfig.schema');

const QUERY_SAFE_PARAMS = ['type', 'key'];
const QUERY_SELECT_COLUMNS = ['id', 'type', 'key', 'value'];

const pub = {};

/**
 * 获取列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchAllByParam = (queryParam) => {
  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return systemConfigSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

module.exports = pub;
