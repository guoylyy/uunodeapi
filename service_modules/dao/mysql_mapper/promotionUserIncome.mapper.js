'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const promotionUserIncomeSchema = require('./schema/promotionUserIncome.schema');


const QUERY_SAFE_PARAMS = ['id', 'promoterUserId', 'inviteeUserId', 'clazzId', 'status'];
const QUERY_SELECT_COLUMNS = ['id', 'clazzId', 'status', 'inviteeUserId', 'promoterUserId', 'promoterUserIncome'];

const queryBuilder = (queryParam) => (query) => queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);

const pub = {};

/**
 * 创建新的条目
 *
 * @param incomeItem
 * @returns {*}
 */
pub.create = (incomeItem) => {
  // 参数检查
  if (!_.isPlainObject(incomeItem) || !_.isNil(incomeItem.id) || _.isNil(incomeItem.promoterUserId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(incomeItem);

  return promotionUserIncomeSchema.create(incomeItem);
};

/**
 * 获取列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchAllByParam = (queryParam) => {
  debug(queryParam);

  return promotionUserIncomeSchema.findAll(queryBuilder(queryParam), QUERY_SELECT_COLUMNS);
};

/**
 * 更新条目
 *
 * @param incomeItem
 * @returns {*}
 */
pub.update = (incomeItem) => {
  // 参数检查
  if (!_.isPlainObject(incomeItem) || _.isNil(incomeItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(incomeItem);

  return promotionUserIncomeSchema.update(incomeItem);
};

/**
 * 分页查询
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*}
 */
pub.fetchPagedPromotionIncom = (queryParam, pageNumber = 1, pageSize = 10) => {
  debug(queryParam);

  return promotionUserIncomeSchema.fetchPagedAll(queryBuilder(queryParam), QUERY_SELECT_COLUMNS, pageNumber, pageSize);
};

module.exports = pub;
