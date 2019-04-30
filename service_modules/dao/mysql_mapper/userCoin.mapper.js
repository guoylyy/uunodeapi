'use strict';

/**
 * userCoin数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const userCoinSchema = require('./schema/userCoin.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

/**
 * 查询userCoin列表
 * @param queryParams
 * @returns {Promise}
 */
let safeParams = ['userId', 'id'],
    selectColumns = ['id', 'coinChange', 'userId', 'title', 'changeDate', 'remark'];
pub.queryUserCoins = (queryParams) => {
  return userCoinSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, safeParams)
      })
      .orderBy('changeDate', 'desc')
      .fetchAll({ columns: selectColumns })
      .then((userCoinList) => {
        debug(userCoinList);
        return userCoinList.toJSON();
      });
};

/**
 * 计算用户优币总额
 *
 * @param usrId
 * @returns {*}
 */
pub.sumUserCoin = (usrId) => {
  if (_.isNil(usrId)) {
    return null;
  }

  return userCoinSchema.query(
      (query) => {
        query.sum('coinChange as sum').where('userId', usrId)
      })
      .fetchAll()
      .then((sumList) => {
        let coinSum = _.first(sumList.toJSON()).sum;
        debug('%s优币总额%d', usrId, coinSum);

        return _.toNumber(coinSum);
      })
};

/**
 * CREATE
 * 新建并保存 coinItem 信息
 *
 * @param coinItem
 * @returns {Promise.<TResult>}
 */
pub.create = (coinItem) => {
  if (!_.isPlainObject(coinItem) || !_.isNil(coinItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', coinItem);
  return userCoinSchema.forge(coinItem)
      .save(null, {
        method: 'insert'
      })
      .then((result) => {
        debug('--- Save success ---');
        debug(result);

        return result.toJSON();
      });
};

/**
 * 删除 coinId
 *
 * @param bizId
 * @returns {Promise.<TResult>|Promise}
 */
pub.destroyByBizId = (bizId) => {
  if (_.isNil(bizId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to destroy: bizId : %d', bizId);
  return userCoinSchema.query(
      (query) => {
        query.where('bizId', bizId)
      })
      .destroy({ transacting: true })
      .then((result) => {
        debug(result);

        return result.toJSON();
      })
};

module.exports = pub;
