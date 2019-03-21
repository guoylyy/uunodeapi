'use strict';

/**
 * userWithdraw数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const userWithdrawSchema = require('./schema/userWithdraw.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAMS = ['id', 'userId', 'status', 'applyDate'],
    QUERY_SELECT_COLUMNS = ['id', 'userId', 'score', 'applyMoney', 'applyDate', 'status', 'payway'];


/**
 * 解析用户退款item
 *
 * @param withdrawItem
 * @returns {*}
 */
const parseWithdrawFields = (withdrawItem) => {
  debug(withdrawItem);

  // 解析微信退款结果
  if (!_.isNil(withdrawItem.withdrawInfo)) {
    // 这里是为了处理数据迁移中导致的 {'key': 'value'} 不符合JSON标准
    const withdrawInfo = eval(`( ${ withdrawItem.withdrawInfo } )`);

    debug(withdrawInfo);
    withdrawItem.withdrawInfo = withdrawInfo;
  }

  return withdrawItem;
};

const pub = {};

/**
 * 查询退款记录列表
 * @param queryParams
 * @returns {Promise}
 */
pub.query = (queryParams) => {
  return userWithdrawSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, QUERY_SAFE_PARAMS)
      })
      .orderBy('applyDate', 'desc')
      .fetchAll({ columns: QUERY_SELECT_COLUMNS })
      .then((withdrawList) => {
        debug(withdrawList);
        return withdrawList.toJSON();
      });
};

/**
 * 查询分页用户列表
 *
 * @param queryParam
 * * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPagedWithdraws = (queryParam, pageNumber, pageSize) => {
  return userWithdrawSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
      .orderBy('updatedAt', 'desc')
      .fetchPage({
        columns: QUERY_SELECT_COLUMNS,
        page: pageNumber,
        pageSize: pageSize
      })
      .then((result) => {
            debug(result.toJSON());

            return {
              values: result.toJSON(),
              itemSize: result.pagination.rowCount,
              pageSize: result.pagination.pageSize,
              pageNumber: result.pagination.page
            };
          }
      );
};

/**
 * CREATE
 * 新建并保存 userWithdraw 信息
 *
 * @param withdrawItem
 * @returns {Promise.<TResult>}
 */
pub.create = (withdrawItem) => {
  if (!_.isPlainObject(withdrawItem) || !_.isNil(withdrawItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', withdrawItem);
  return userWithdrawSchema.forge(withdrawItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((result) => {
        debug('--- Save success ---');
        debug(result);

        return result.toJSON();
      });
};

/**
 * 删除 withdrawItem
 *
 * @param withdrawId
 * @returns {Promise.<TResult>|Promise}
 */
pub.destroy = (withdrawId) => {
  if (_.isNil(withdrawId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to destroy: %d', withdrawId);
  return userWithdrawSchema.forge({ id: withdrawId })
      .destroy({
        transacting: true
      })
      .then((result) => {
        debug(result);

        return result.toJSON();
      })
};

/**
 * 根据用户openId, id获取用户信息
 * @param queryParam
 * @returns {Promise}
 */
pub.fetchByParam = (queryParam) => {
  const QUERY_SAFE_PARAMS = ['id'];

  return userWithdrawSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
      })
      .fetch()
      .then((withdrawItem) => {
            debug(withdrawItem);

            if (_.isNil(withdrawItem)) {
              return null;
            }

            return parseWithdrawFields(withdrawItem.toJSON());
          }
      )
};

const UPDATE_SAFE_FIELDS = ['id', 'verifiedMoney', 'verifiedRemark', 'status', 'verifiedDate', 'withdrawInfo'];
/**
 * 更新用户退款信息
 *
 * @param withdrawItem
 * @returns {*}
 */
pub.update = (withdrawItem) => {
  if (_.isNil(withdrawItem) || _.isNil(withdrawItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(withdrawItem);

  // 过滤字段
  let pickedWithdrawItem = _.pick(withdrawItem, UPDATE_SAFE_FIELDS);
  debug(pickedWithdrawItem);

  return userWithdrawSchema.forge(pickedWithdrawItem)
      .save(null, {
        transacting: true,
        method: 'update'
      })
      .then((withdrawItem) => {
        debug('update withdraw: %j', withdrawItem);

        return parseWithdrawFields(withdrawItem.toJSON());
      })
};

module.exports = pub;
