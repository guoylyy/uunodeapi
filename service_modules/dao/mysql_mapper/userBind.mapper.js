'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const userBindSchema = require('./schema/userBind.schema');


const QUERY_SAFE_PARAMS = ['id', 'userId', 'type', 'accountName', 'taskGuide'];
const QUERY_SELECT_COLUMNS = ['id', 'userId', 'accountName', 'taskGuide'];

const pub = {};

/**
 * 创建新的第三方用户
 *
 * @param userBindItem
 * @returns {*}
 */
pub.create = (userBindItem) => {
  // 参数检查
  if (!_.isPlainObject(userBindItem) || !_.isNil(userBindItem.id) || _.isNil(userBindItem.userId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(userBindItem);

  return userBindSchema.create(userBindItem);
};

/**
 * 根据属性获取一个第三方用户
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchByParam = (queryParam) => {
  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
  };

  return userBindSchema.findOne(queryBuilder);
};

/**
 * 根据属性获取第三方用户列表
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {

  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
  };

  return userBindSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

/**
 * 处理关键词查询
 * 构造 学号 或 姓名 like keyword
 *
 * @param query     knex query builder
 * @param keyword   关键词
 */
const digestUserKeyword = (query, keyword) => {
  if (keyword && _.isString(keyword)) {
    let likeKeyWord = '%' + keyword + '%';
    query.andWhere(function () {
      this.where('user.studentNumber', 'LIKE', likeKeyWord)
          .orWhere('user.name', 'LIKE', likeKeyWord);
    });
  }
  return query;
};

/**
 * 分页查询第三方用户列表
 *
 * @param queryParam
 * @param pageSize
 * @param pageNumber
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPaged = (queryParam, pageSize, pageNumber) => {
  console.log(queryParam);
  return userBindSchema.query(
      (query) => {
        query = query.leftJoin(
          'user',
          'user.id',
          'user_bind.userId'
        )
        digestUserKeyword(query, queryParam.keyword);
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
      .orderBy('user.createdAt', 'desc')
      .fetchPage({
        columns: ['user.*'],
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
      });
};

/**
 * 更新第三方帐号信息
 *
 * @param userBindItem
 * @returns {*}
 */
pub.update = (userBindItem) => {
  debug(userBindItem);

  if (!_.isPlainObject(userBindItem) || _.isNil(userBindItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  return userBindSchema.update(userBindItem);
};

module.exports = pub;
