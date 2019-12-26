'use strict';

/**
 * School 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const bookshelf = require('../mysql.connection');
const queryUtil = require('../util/queryUtil');
const schoolSchema = require('./schema/school.schema');

// 常量： 安全查询参数；用于限制查询时的参列表
const QUERY_SAFE_PARAMS = ['id', 'name', 'isOpen'];

const defaultSelectColumns = ['id', 'image', 'name', 'province', 'isOpen', 'createdAt', 'updatedAt'];

let pub = {};

/**
 * 查询用户列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAll = (queryParam) => {
  let safeParams = ['id', 'type', 'isOpen'];

  return schoolSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
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
