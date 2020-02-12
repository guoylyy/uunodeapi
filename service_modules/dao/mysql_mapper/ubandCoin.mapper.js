'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const ubandCoinSchema = require('./schema/ubandCoin.schema');

const QUERY_SAFE_PARAMS = ['id', 'userId', 'transactionId'];
const QUERY_SELECT_COLUMNS = ['id', 'userId', 'coinChange', 'transactionId', 'title'];

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
 * 创建新的条目
 *
 * @param ubandCoinItem
 * @returns {*}
 */
pub.create = (ubandCoinItem) => {
  // 参数检查
  if (!_.isPlainObject(ubandCoinItem) || !_.isNil(ubandCoinItem.id) || _.isNil(ubandCoinItem.userId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(ubandCoinItem);

  return ubandCoinSchema.create(ubandCoinItem);
};

/**
 * 获取单个条目
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchOneByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return ubandCoinSchema.findOne(queryBuilder);
};

/**
 * 获取列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchAllByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return ubandCoinSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

/**
 * 计算用户友币总额
 *
 * @param userId
 * @returns {*}
 */
pub.sumUserUbandCoin = (userId) => {
  if (_.isNil(userId)) {
    return null;
  }

  return ubandCoinSchema.query(
      (query) => {
        query.sum('coinChange as sum').where('userId', userId)
      })
      .fetchAll()
      .then((sumList) => {
        let coinSum = _.first(sumList.toJSON()).sum;
        debug('%s友币总额%d', userId, coinSum);

        return _.toNumber(coinSum);
      });
};

module.exports = pub;
