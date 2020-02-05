'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');

const userLikeSchema = require('./schema/userLike.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

/**
 * 查询 userLike 列表
 * @param queryParams
 * @returns {Promise}
 */
const QUERY_SAFE_PARAMS = ['id','appType','likeType','isValid'],
    QUERY_SELECT_COLUMNS = ['id', 'userId', 'outBizId', 'likeType','likeRemark','appType','createdAt','updatedAt','likeCount'];


/**
 * 查询分页用户笔芯列表
 *
 * @param queryParam
 * * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPageUserLikes = (queryParam, pageNumber, pageSize) => {
  return userLikeSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
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
 * 新建并保存 userLike 信息
 *
 * @param userLike
 * @returns {Promise.<TResult>}
 */
pub.create = (userLike) => {
  if (!_.isPlainObject(userLike) || !_.isNil(userLike.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', userLike);
  return userLikeSchema.forge(userLike)
      .save(null, {
        method: 'insert'
      })
      .then((result) => {
        debug('--- Save success ---');
        debug(result);

        return result.toJSON();
      });
};

let safeUpdateFields = ['id'];

/**
 * 更新 userLike 信息
 *
 * @param userLike
 * @returns {Promise.<TResult>}
 */
pub.update = (userLike) => {
  if (!_.isPlainObject(userLike) || _.isNil(userLike.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickedUserPay = _.pick(userLike, safeUpdateFields);
  debug(pickedUserPay);

  debug('Ready to update: %j', userLike);
  return userLikeSchema.forge(pickedUserPay)
      .save(null, {
        method: 'update'
      })
      .then((result) => {
        debug('--- Update success ---');
        debug(result);

        return result.toJSON();
      });
};

/**
 * 查询用户支付记录
 *
 * @param queryParam
 * @returns {Promise}
 */
pub.fetchByParam = (queryParam) => {
  const safeParams = ['id','userId','appType','likeType','isValid'];

  return userLikeSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, safeParams)
      })
      .fetchAll()
      .then((userLikeItem) => {
        debug(userLikeItem);
        if (_.isNil(userLikeItem)) {
          return null;
        }
        return userLikeItem.toJSON();
      })
};


/**
 * 计算用户优币总额
 *
 * @param usrId
 * @returns {*}
 */
pub.sumUserLike = (usrId, appType) => {
  if (_.isNil(usrId)) {
    return null;
  }

  return userLikeSchema.query(
      (query) => {
        query.sum('likeCount as sum').where('userId', usrId)
            .andWhere('isValid', 1).andWhere('appType',appType);
      })
      .fetchAll()
      .then((sumList) => {
        let likeSum = _.first(sumList.toJSON()).sum;
        debug('%s笔芯总额%d', usrId, likeSum);

        return _.toNumber(likeSum);
      })
};



module.exports = pub;
