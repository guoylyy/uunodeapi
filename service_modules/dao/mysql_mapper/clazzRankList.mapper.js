'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const clazzRankSchema = require('./schema/clazzRankList.schema');

const QUERY_SAFE_PARAMS = ['id', 'clazzId', 'userId'];
const QUERY_DEFAULT_SELECT_COLUMNS = ['id', 'userId', 'clazzId', 'rank', 'grade', 'updatedAt'];

const getQueryBuilder = (queryParam) => (query) => {
  queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
};

const pub = {};

/**
 * 新建一个排行榜记录
 *
 * @param clazzRankItem
 * @returns {*}
 */
pub.create = (clazzRankItem) => {
  // 参数检查
  if (!_.isPlainObject(clazzRankItem) || !_.isNil(clazzRankItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(clazzRankItem);

  return clazzRankSchema.create(clazzRankItem);
};

/**
 * 更新一个排行榜记录
 *
 * @param clazzRankItem
 * @returns {Promise|Promise.<*>}
 */
pub.update = (clazzRankItem) => {
  // 参数检查
  if (!_.isPlainObject(clazzRankItem) || _.isNil(clazzRankItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(clazzRankItem);

  return clazzRankSchema.update(clazzRankItem);
};

/**
 * 查询一条排行榜
 *
 * @param queryParam
 * @returns {*}
 */
pub.fetchByParam = (queryParam) => {
  return clazzRankSchema.findOne(getQueryBuilder(queryParam));
};

/**
 * 分页查询排行榜记录
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPageClazzRanks = (queryParam, pageNumber, pageSize) => {
  return clazzRankSchema.query(getQueryBuilder(queryParam))
      .orderBy('rank', 'asc')
      .fetchPage({
        columns: QUERY_DEFAULT_SELECT_COLUMNS,
        page: pageNumber,
        pageSize: pageSize
      })
      .then((result) => {
        debug(result);

        if (_.isNil(result)) {
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

pub.queryAllClazzRanks = (queryParam) => {
  return clazzRankSchema.findAll(getQueryBuilder(queryParam), QUERY_DEFAULT_SELECT_COLUMNS, 'rank');
};

module.exports = pub;
