'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const winston = require('winston');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const adminSchema = require('./schema/admin.schema');

const pub = {};

const DEFAULT_SELECT_COLUMNS = ['id', 'phoneNumber', 'name', 'headImgUrl', 'role', 'saltPassword'];
const QUERY_SAFE_PARAMS = ['id', 'phoneNumber'];
const SAFE_UPDATE_FIELDS = ['id', 'name', 'headImgUrl', 'role', 'saltPassword', 'authToken', 'authExpire'];

/**
 * 根据用户openId, id获取用户信息
 * @param queryParam
 * @returns {Promise}
 */
pub.fetchByParam = (queryParam) => {
  return adminSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
      })
      .fetch()
      .then((admin) => {
            debug(admin);
            if (_.isNil(admin)) {
              return null;
            }

            return admin.toJSON();
          }
      )
};

/**
 * 分页查询管理员列表
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPageAdmins = (queryParam, pageNumber, pageSize) => {

  return adminSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
      .fetchPage({
        columns: DEFAULT_SELECT_COLUMNS,
        page: pageNumber,
        pageSize: pageSize
      })
      .then((result) => {
            debug(result);

            if (!result) {
              return null;
            }

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
 * 新建管理员
 *
 * @param adminItem
 * @returns {*}
 */
pub.create = (adminItem) => {
  if (!_.isPlainObject(adminItem) || !_.isNil(adminItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }
  debug(adminItem);

  return adminSchema.forge(adminItem)
      .save(null, {
        method: 'insert'
      })
      .then((adminModel) => {
        debug('Created admin: %j', adminModel);

        return adminModel.toJSON();
      })
};

/**
 * 更新信息
 * @param adminItem
 * @returns {*}
 */
pub.update = (adminItem) => {
  if (!_.isPlainObject(adminItem) || _.isNil(adminItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickedAdminItem = _.pick(adminItem, SAFE_UPDATE_FIELDS);
  debug(pickedAdminItem);

  return adminSchema.forge(pickedAdminItem)
      .save(null, {
        method: 'update'
      })
      .then((adminModel) => {
        debug('Saved admin: %j', adminModel);

        return adminModel.toJSON();
      })
};

/**
 * 查询所有满足条件的管理员列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {
  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return adminSchema.findAll(queryBuilder, DEFAULT_SELECT_COLUMNS);
};

module.exports = pub;
