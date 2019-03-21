'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const winston = require('winston');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const userScoreRecordSchema = require('./schema/userScoreRecord.schema');

const QUERY_SAFE_PARAMS = ['id', 'userId', 'clazzId', 'type', 'targetId'];
const QUERY_SELECT_COLUMNS = ['id', 'userId', 'clazzId', 'adminId', 'scoreChange', 'type', 'targetId', 'remark'];

const filterQueryParam = (queryParam) => (query) => {
  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
};

const pub = {};

/**
 * 新建用户积分记录
 *
 * @param scoreRecordItem
 * @returns {*}
 */
pub.create = (scoreRecordItem) => {
  if (!_.isPlainObject(scoreRecordItem) || !_.isNil(scoreRecordItem.id)) {
    winston.error('新建用户积分记录失败，参数错误！scoreRecordItem: %j', scoreRecordItem);
    return Promise.reject(new Error('参数错误'));
  }

  debug(scoreRecordItem);

  return userScoreRecordSchema.create(scoreRecordItem);
};

/**
 * 根据查询条件获取记录
 *
 * @param queryParam
 * @returns {Query|*}
 */
pub.fetchOneByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return userScoreRecordSchema.findOne(queryBuilder);
};

/**
 * 更新用户积分记录
 *
 * @param scoreRecordItem
 * @returns {*}
 */
pub.update = (scoreRecordItem) => {
  if (!_.isPlainObject(scoreRecordItem) || _.isNil(scoreRecordItem.id)) {
    winston.error('更新用户积分记录失败，参数错误！scoreRecordItem: %j', scoreRecordItem);
    return Promise.reject(new Error('参数错误'));
  }

  debug(scoreRecordItem);

  return userScoreRecordSchema.update(scoreRecordItem);
};

/**
 * 根据查询条件获取记录列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return userScoreRecordSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

module.exports = pub;
