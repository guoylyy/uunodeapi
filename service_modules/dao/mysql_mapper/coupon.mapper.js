'use strict';

/**
 * coupon数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const couponSchema = require('./schema/coupon.schema');
const queryUtil = require('../util/queryUtil');

// 常量： 安全查询参数；用于限制查询时的参列表
const QUERY_SAFE_PARAMS = ['id', 'userId', 'status', 'expireDate', 'money', 'remark'];
// 常量： 查询结果；用于在列表结果中过滤非必要参数
const QUERY_SELECT_COLUMNS = ['id', 'userId', 'money', 'status', 'remark', 'createdAt', 'expireDate'];
// 常量： 优惠券可更新信息
const SAFE_UPDATE_FIELDS = ['id', 'status', 'money', 'remark', 'expireDate'];

let pub = {};

/**
 * 查询coupon
 * @param queryParams
 * @returns {Promise}
 */
pub.fetchCouponByParams = (queryParams) => {

  return couponSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, QUERY_SAFE_PARAMS)
      })
      .orderBy('money', 'desc')
      .orderBy('expireDate', 'asc')
      .fetch()
      .then((coupon) => {
        debug(coupon);

        if (_.isNil(coupon)) {
          return null;
        }

        return coupon.toJSON();
      });
};

/**
 * 查询coupon列表
 * @param queryParams
 * @returns {Promise}
 */
pub.fetchAllCouponByParams = (queryParams) => {

  return couponSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, QUERY_SAFE_PARAMS)
      })
      .orderBy('money', 'desc')
      .orderBy('expireDate', 'asc')
      .fetchAll({ columns: QUERY_SELECT_COLUMNS })
      .then((coupon) => {
        debug(coupon);

        if (_.isNil(coupon)) {
          return null;
        }

        return coupon.toJSON();
      });
};

/**
 * 更新信息
 * @param couponItem
 * @returns {*}
 */
pub.update = (couponItem) => {
  if (!_.isPlainObject(couponItem) || _.isNil(couponItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickeCouponItem = _.pick(couponItem, SAFE_UPDATE_FIELDS);
  debug(pickeCouponItem);

  return couponSchema.forge(pickeCouponItem)
      .save(null, {
        method: 'update'
      })
      .then((couponItem) => {
        debug('Updated coupon: %j', couponItem);

        return couponItem.toJSON();
      })
};

/**
 * CREATE
 * 新建并保存 couponItem 信息
 *
 * @param couponItem
 * @returns {Promise.<TResult>}
 */
pub.create = (couponItem) => {
  if (!_.isPlainObject(couponItem) || !_.isNil(couponItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', couponItem);
  return couponSchema.forge(couponItem)
      .save(null, {
        method: 'insert'
      })
      .then((result) => {
        debug('--- Save success ---');
        debug(result);

        return result.toJSON();
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
pub.queryPagedCoupons = (queryParam, pageNumber, pageSize) => {
  return couponSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
      .orderBy('createdAt', 'desc')
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
 * 删除 postId
 *
 * @param couponId
 * @returns {Promise.<TResult>|Promise}
 */
pub.destroy = (couponId) => {
  if (_.isNil(couponId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to destroy: %d', couponId);
  return couponSchema.forge({ id: couponId })
      .destroy({
      })
      .then((result) => {
        debug(result);

        return result.toJSON();
      })
};

module.exports = pub;
