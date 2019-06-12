'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const userPaySchema = require('./schema/userPay.schema');
const queryUtil = require('../util/queryUtil');

/**
 * 处理用户付款记录
 *
 * @param userPayItem
 * @returns {*}
 */
const parseUserPayFields = (userPayItem) => {
  if (!_.isNil(userPayItem.payInfo)) {
    userPayItem.payInfo = JSON.parse(userPayItem.payInfo);

    userPayItem.payInfo.signData.totalFee = userPayItem.payInfo.signData.totalFee || userPayItem.payInfo.signData._total_fee;
  }

  return userPayItem;
};

const pub = {};

/**
 * 查询 userPay 列表
 * @param queryParams
 * @returns {Promise}
 */
const QUERY_SAFE_PARAMS = ['bookingNo', 'status', 'payway', 'userId', 'outBizId', 'outBizType'],
    QUERY_SELECT_COLUMNS = ['id', 'status', 'payway', 'userId', 'outBizId', 'outBizType', 'payTime', 'payInfo', 'bill'];
pub.queryUserPays = (queryParams) => {
  return userPaySchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, QUERY_SAFE_PARAMS)
      })
      .orderBy('updatedAt', 'desc')
      .fetchAll({ columns: QUERY_SELECT_COLUMNS })
      .then((userPayList) => {
        debug('--- Query success ---');
        debug(userPayList);

        return _.map(userPayList.toJSON(), parseUserPayFields);
      });
};

/**
 * CREATE
 * 新建并保存 userPay 信息
 *
 * @param userPay
 * @returns {Promise.<TResult>}
 */
pub.create = (userPay) => {
  if (!_.isPlainObject(userPay) || !_.isNil(userPay.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', userPay);
  return userPaySchema.forge(userPay)
      .save(null, {
        method: 'insert'
      })
      .then((result) => {
        debug('--- Save success ---');
        debug(result);

        return result.toJSON();
      });
};

let safeUpdateFields = ['id', 'status', 'transactionId'];
/**
 * 更新 userPay 信息
 *
 * @param userPay
 * @returns {Promise.<TResult>}
 */
pub.update = (userPay) => {
  if (!_.isPlainObject(userPay) || _.isNil(userPay.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickedUserPay = _.pick(userPay, safeUpdateFields);
  debug(pickedUserPay);

  debug('Ready to update: %j', userPay);
  return userPaySchema.forge(pickedUserPay)
      .save(null, {
        method: 'update'
      })
      .then((result) => {
        debug('--- Update success ---');
        debug(result);

        return result.toJSON();
      });
};

/**
 * 查询用户支付记录
 *
 * @param queryParam
 * @returns {Promise}
 */
pub.fetchByParam = (queryParam) => {
  const safeParams = ['id'];

  return userPaySchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, safeParams)
      })
      .fetch()
      .then((userPayItem) => {
        debug(userPayItem);

        if (_.isNil(userPayItem)) {
          return null;
        }

        return parseUserPayFields(userPayItem.toJSON())
      })
};

module.exports = pub;
