'use strict';

/**
 * userWithdraw数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const userWithdrawLogSchema = require('./schema/userWithdrawLog.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

/**
 * 新建并保存 userWithdrawLog 信息
 *
 * @param withdrawLogItem
 * @returns {Promise.<TResult>}
 */
pub.create = (withdrawLogItem) => {
  debug(withdrawLogItem);

  if (!_.isPlainObject(withdrawLogItem) || !_.isNil(withdrawLogItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', withdrawLogItem);
  return userWithdrawLogSchema.forge(withdrawLogItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((withdrawLogItem) => {
        debug('--- Save success ---');
        debug(withdrawLogItem);

        return withdrawLogItem.toJSON();
      });
};

module.exports = pub;
