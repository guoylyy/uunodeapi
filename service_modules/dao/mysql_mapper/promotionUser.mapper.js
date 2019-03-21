'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const promotionUserSchema = require('./schema/promotionUser.schema');

const QUERY_SAFE_PARAMS = ['id', 'userId', 'key'];
const QUERY_SELECT_COLUMNS = ['userId', 'key'];

/**
 * 根据查询参数进行queryBuilder的构建
 *
 * @param queryParam
 */
const filterQueryParam = (queryParam) => (query) => {
  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
};

const parsePromotionUser = (user) => {
  if (_.isNil(user)) {
    return user;
  }

  if (!_.isNil(user.qrcode)) {
    user.qrcode = JSON.parse(user.qrcode);
  }

  return user;
};

const pub = {};

/**
 * 创建新的条目
 *
 * @param userBindItem
 * @returns {*}
 */
pub.create = (userBindItem) => {
  // 参数检查
  if (!_.isPlainObject(userBindItem) || !_.isNil(userBindItem.id) || _.isNil(userBindItem.userId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(userBindItem);

  return promotionUserSchema.create(userBindItem)
      .then(parsePromotionUser);
};

/**
 * 获取单个条目
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchOneByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return promotionUserSchema.findOne(queryBuilder)
      .then(parsePromotionUser);
};

/**
 * 获取列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchAllByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return promotionUserSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS)
      .then((promotionUserList) => _.map(promotionUserList, parsePromotionUser));
};

module.exports = pub;
