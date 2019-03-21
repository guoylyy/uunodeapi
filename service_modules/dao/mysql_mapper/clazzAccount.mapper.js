'use strict';

/**
 * clazzAccount数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const clazzAccountSchema = require('./schema/clazzAccount.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

const QUERY_SAFE_PARAMS = ['id', 'userId', 'clazzId', 'status'];
const QUERY_SELECT_COLUMNS = ['id', 'status', 'joinDate', 'endDate', 'userId', 'clazzId', 'addCheckinCount',
  'feedbackRound', 'easemobFriendCount', 'purchasedFeedbackCount', 'usedFeedbackCount', 'updatedAt'];
/**
 * 查询ClazzAccount
 *
 * @param queryParams
 * @returns {Promise}
 */
pub.queryClazzAccounts = (queryParams) => {
  return clazzAccountSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, QUERY_SAFE_PARAMS)
      })
      .orderBy('updatedAt', 'desc')
      .fetchAll({ columns: QUERY_SELECT_COLUMNS })
      .then((clazzAccountList) => {
        return clazzAccountList.toJSON();
      });
};


/**
 * 根据id获取clazz_account记录
 *
 * @param queryParam
 * @returns {Promise}
 */
pub.fetchByParam = (queryParam) => {
  const safeParams = ['id'];

  return clazzAccountSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, safeParams)
      })
      .fetch()
      .then((clazzAccount) => {
            debug(clazzAccount);
            if (_.isNil(clazzAccount)) {
              return null;
            }

            return clazzAccount.toJSON();
          }
      )
};

/**
 * 计数
 *
 * @param queryParams
 * @returns {*|Query|Promise.<Number>}
 */
pub.countClazzAccounts = (queryParams) => {
  let safeParams = ['clazzId', 'status'];

  return clazzAccountSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, safeParams)
      })
      .count();
};

/**
 * 计算一组数据
 */
pub.countClazzAccountsByGroup = (queryParams) =>{
  let safeParams = ['clazzId', 'status'];
  return clazzAccountSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, safeParams);
        query.groupBy('clazzId');
        query.count('* as count');
        query.select("clazzId")
      }).fetchAll();

};

/**
 * 新建管理员
 *
 * @param clazzAccountItem
 * @returns {*}
 */
pub.create = (clazzAccountItem) => {
  if (!_.isPlainObject(clazzAccountItem) || !_.isNil(clazzAccountItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }
  debug(clazzAccountItem);

  return clazzAccountSchema.forge(clazzAccountItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((clazzAccountSchema) => {
        debug('Created clazz_account: %j', clazzAccountSchema);

        return clazzAccountSchema.toJSON();
      })
};

const UPDATE_SAFE_FIELDS = ['id', 'status', 'joinDate', 'clazzId', 'bill', 'invitations', 'addCheckinCount', 'endDate',
  'feedbackRound', 'easemobFriendCount', 'purchasedFeedbackCount', 'usedFeedbackCount', 'clazzScore'];
/**
 * 更新信息
 * @param clazzAccountItem
 * @returns {*}
 */
pub.update = (clazzAccountItem) => {
  if (!_.isPlainObject(clazzAccountItem) || _.isNil(clazzAccountItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickeClazzAccountItem = _.pick(clazzAccountItem, UPDATE_SAFE_FIELDS);
  debug(pickeClazzAccountItem);

  return clazzAccountSchema.forge(pickeClazzAccountItem)
      .save(null, {
        transacting: true,
        method: 'update'
      })
      .then((clazzAccountItem) => {
        debug('Updated clazz_account: %j', clazzAccountItem);

        return clazzAccountItem.toJSON();
      })
};

module.exports = pub;
