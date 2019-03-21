'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const smsSecurityCodeSchema = require('./schema/smsSecurityCode.schema');

const QUERY_SAFE_PARAMS = ['phoneNumber', 'code', 'expireAt', 'codeType', 'userId', 'createdAt'];
const QUERY_SELECT_COLUMNS = ['id', 'phoneNumber', 'code', 'expireAt', 'codeType', 'userId'];

const pub = {};

/**
 * 生成新的短信记录
 *
 * @param securityCodeItem
 * @returns {*}
 */
pub.create = (securityCodeItem) => {
  debug(securityCodeItem);

  if (!_.isPlainObject(securityCodeItem) || _.isNil(securityCodeItem.phoneNumber) || _.isNil(securityCodeItem.code)) {
    return Promise.reject(new Error('参数错误'));
  }

  return smsSecurityCodeSchema.create(securityCodeItem);
};

/**
 * 根据属性获取一个短信记录
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchByParam = (queryParam) => {
  debug(queryParam);

  if (!_.isPlainObject(queryParam) || _.isEmpty(queryParam)) {
    return Promise.reject(new Error('参数错误'));
  }

  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
  };

  return smsSecurityCodeSchema.findOne(queryBuilder, '-expireAt');
};

/**
 * 根据属性获取短信记录列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {
  debug(queryParam);

  if (!_.isPlainObject(queryParam) || _.isEmpty(queryParam)) {
    return Promise.reject(new Error('参数错误'));
  }

  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return smsSecurityCodeSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS, '-expireAt');
};

/**
 * 计数
 *
 * @param queryParam
 * @returns {*}
 */
pub.countAll = (queryParam) => {
  debug(queryParam);

  if (!_.isPlainObject(queryParam) || _.isEmpty(queryParam)) {
    return Promise.reject(new Error('参数错误'));
  }

  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return smsSecurityCodeSchema.countAll(queryBuilder);
};

/**
 * 更新item
 *
 * @param smsSecurityCodeItem
 * @returns {*}
 */
pub.update = (smsSecurityCodeItem) => {
  debug(smsSecurityCodeItem);

  if (!_.isPlainObject(smsSecurityCodeItem) || _.isNil(smsSecurityCodeItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  return smsSecurityCodeSchema.update(smsSecurityCodeItem);
};

module.exports = pub;
