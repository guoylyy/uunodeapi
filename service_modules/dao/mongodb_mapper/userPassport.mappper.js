'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const userPassportSchema = require('./schema/userPassport.schema');

const QUERY_SAFE_PARAM_LIST = ['userId'];

const pub = {};

/**
 * 创建班级信息
 *
 * @param userPassportItem
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.create = (userPassportItem) => {
  debug(userPassportItem);

  return userPassportSchema.createItem(userPassportItem);
};

/**
 * 根据clazzId获取班级信息
 *
 * @param userId
 * @returns {Promise.<TResult>}
 */
pub.fetchByUserId = (userId) => {
  debug(userId);

  return userPassportSchema.findItemByParam({ userId: userId }, QUERY_SAFE_PARAM_LIST);
};

/**
 * 根据id将更新班级信息
 *
 * @param id
 * @param userPassportItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (id, userPassportItem) => {
  debug(id);
  debug(userPassportItem);

  return userPassportSchema.updateItemById(id, userPassportItem);
};

module.exports = pub;
