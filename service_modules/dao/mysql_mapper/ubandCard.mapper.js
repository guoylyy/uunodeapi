'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const ubandCardSchema = require('./schema/ubandCard.schema');

const QUERY_SAFE_PARAMS = ['id', 'userId','status', 'expireDate'];
const UPDATE_SAFE_FIELDS = ['id', 'status' , 'title', 'remark','scope'];
const QUERY_SELECT_COLUMNS = ['id', 'userId', 'type','status','title', 'remark','scope','iconUrl','expireDate'];

/**
 * 根据查询参数进行queryBuilder的构建
 *
 * @param queryParam
 */
const filterQueryParam = (queryParam) => (query) => {
  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
};

const pub = {};

/**
 * 创建新的条目
 *
 * @param ubandCoinItem
 * @returns {*}
 */
pub.create = (ubandCardItem) => {
  // 参数检查
  if (!_.isPlainObject(ubandCardItem) || !_.isNil(ubandCardItem.id) || _.isNil(ubandCardItem.userId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(ubandCardItem);

  return ubandCardSchema.create(ubandCardItem);
};

/**
 * 获取单个条目
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchOneByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return ubandCardSchema.findOne(queryBuilder);
};

/**
 * 获取列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchAllByParam = (queryParam) => {
  const queryBuilder = filterQueryParam(queryParam);

  return ubandCardSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};


/**
 * 更新信息
 */
pub.update = (cardItem) => {
  if (!_.isPlainObject(cardItem) || _.isNil(cardItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickedItem = _.pick(cardItem, UPDATE_SAFE_FIELDS);
  debug(pickedItem);

  return ubandCardSchema.forge(pickedItem)
      .save(null, {
        method: 'update'
      })
      .then((updatedCardItem) => {
        debug('Updated uband_card: %j', updatedCardItem);

        return updatedCardItem.toJSON();
      })
};

/**
 * @param cardId
 * @returns {Promise.<TResult>|Promise}
 */
pub.destroy = (cardId) => {
  if (_.isNil(cardId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to destroy: %d', cardId);
  return ubandCardSchema.forge({ id: cardId })
      .destroy({
      })
      .then((result) => {
        debug(result);
        return result.toJSON();
      })
};

module.exports = pub;
