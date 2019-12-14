'use strict';

/**
 * Adv数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const bookshelf = require('../mysql.connection');
const queryUtil = require('../util/queryUtil');
const advEntitySchema = require('./schema/advEntity.schema');

const advCollection = bookshelf.Collection.extend({model: advEntitySchema});
const defaultSelectColumns = ['id', 'image', 'title', 'type', 'price', 'description', 'redirectKey', 'redirectLink',
  'isOpen', 'createdAt', 'updatedAt'];

let pub = {};

/**
 * 查询用户列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAll = (queryParam) => {
  let safeParams = ['id', 'type', 'isOpen'];

  return advEntitySchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, safeParams);
      })
      .fetchAll({columns: defaultSelectColumns})
      .then((advList) => {
            debug(advList);
            if (!advList) {
              return [];
            }
            return advList.toJSON();
          }
      )
};

/**
 * 删除广告
 *
 * @param advId
 * @returns {Promise.<TResult>}
 */
pub.destroy = (advId) => {
  if (_.isNil(advId)) {
    return Promise.reject(new Error('参数错误'));
  }
  debug('Ready to destroy: %d', advId);
  return advEntitySchema.forge({id: advId})
      .destroy({})
      .then((result) => {
        debug(result);
        return result.toJSON();
      })
};

/**
 * 新建广告
 *
 * @param advItem
 * @returns {*}
 */
pub.create = (advItem) => {
  if (!_.isPlainObject(advItem) || !_.isNil(advItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }
  debug(advItem);

  return advEntitySchema.forge(advItem)
      .save(null, {
        method: 'insert'
      })
      .then((item) => {
        debug('Created adv: %j', item);

        return item.toJSON();
      });
};


const UPDATE_SAFAE_FIELDS = ['id', 'image', 'title', 'type', 'description', 'price', 'redirectKey', 'redirectLink', 'isOpen'];

/**
 * 更新信息
 * @param advItem
 * @returns {*}
 */
pub.update = (advItem) => {
  if (!_.isPlainObject(advItem) || _.isNil(advItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }
  // 过滤字段
  let pickedItem = _.pick(advItem, UPDATE_SAFAE_FIELDS);
  debug(pickedItem);

  return advEntitySchema.forge(pickedItem)
      .save(null, {
        method: 'update'
      })
      .then((advItem) => {
        debug('Updated Post: %j', advItem);

        return advItem.toJSON();
      });
};



module.exports = pub;
