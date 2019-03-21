'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const queryUtil = require('../util/queryUtil');
const ubandBannerSchema = require('./schema/ubandBanner.schema');

const QUERY_SAFE_PARAMS = ['id', 'redirectId','bannerType'];
const QUERY_SELECT_COLUMNS = ['id', 'redirectId', 'bannerType','imgUrl','isActive'];

/**
 * 根据查询参数进行queryBuilder的构建
 *
 * @param queryParam
 */
const filterQueryParam = (queryParam) => (query) => {
  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
};

const pub = {};

/**
 * 获取单个条目
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchOneByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return ubandBannerSchema.findOne(queryBuilder);
};

/**
 * 获取列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchAllByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return ubandBannerSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};


module.exports = pub;
