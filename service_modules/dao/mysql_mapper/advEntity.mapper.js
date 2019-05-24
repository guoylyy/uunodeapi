'use strict';

/**
 * Adv数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const Promise = require('bluebird');
const debug = require('debug')('mapper');

const bookshelf = require('../mysql.connection');
const queryUtil = require('../util/queryUtil');
const advEntitySchema = require('./schema/advEntity.schema');

const advCollection = bookshelf.Collection.extend({model: advEntitySchema});
const defaultSelectColumns = ['id', 'image', 'title', 'type', 'redirectKey', 'redirectLink',
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

module.exports = pub;
