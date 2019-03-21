'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const userService = require('./user.service');

const userCoinMapper = require('../dao/mysql_mapper/userCoin.mapper');

let pub = {};

/**
 * 计算用户优币总额
 *
 * @param userId
 * @returns {*}
 */
pub.sumUserCoin = (userId) => {
  if (_.isNil(userId)) {
    winston.error('计算用户%s优币总额，参数错误！！！', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userCoinMapper.sumUserCoin(userId);
};

/**
 * 查询用户优币记录
 *
 * @param userId
 * @returns {Promise.<*>|Promise}
 */
pub.queryUserCoins = (userId) => {
  if (_.isNil(userId)) {
    winston.error('查询用户%s优币列表，参数错误！！！', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userCoinMapper.queryUserCoins({ userId: userId });
};

/**
 * 新建用户优币记录
 *
 * @param userCoin
 * @returns {Promise.<TResult>}
 */
pub.createUserCoin = (userCoin) => {
  if (!_.isPlainObject(userCoin) || !_.isNil(userCoin.id)) {
    winston.error('创建优币失败，参数错误！！！userCoin: %j', userCoin);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userCoinMapper.create(userCoin);
};

/**
 * 根据id删除用户优币记录
 *
 * @param coinBizId
 * @returns {*}
 */
pub.destroyUserCoinItemByBizId = (coinBizId) => {
  if (_.isNil(coinBizId)) {
    winston.error('删除用户优币记录失败，参数错误！！！ userCoinId: %s', coinBizId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userCoinMapper.destroyByBizId(coinBizId);
};

/**
 * 根据id列表查询优币列表
 *
 * @param userCoinIdList
 * @returns {*}
 */
pub.queryUserCoinListByIds = (userCoinIdList) => {
  if (!_.isArray(userCoinIdList)) {
    winston.error('根据id列表查询优币列表失败，参数错误！userCoinIdList：%j', userCoinIdList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  if (_.isEmpty(userCoinIdList)) {
    return Promise.resolve([]);
  }

  return userCoinMapper.queryUserCoins({ id: userCoinIdList })
      .then((userCoinList) => {
        debug(userCoinList);
        const userIds = _.map(userCoinList, 'userId');

        return userService.queryUser(null, userIds)
            .then((userList) => {
              const userMap = _.keyBy(userList, 'id');

              _.forEach(userCoinList, (userCoinItem) => {
                userCoinItem.userInfo = userMap[userCoinItem.userId];
              });

              return userCoinList;
            });
      });
};

module.exports = pub;
