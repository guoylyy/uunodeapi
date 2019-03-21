'use strict';

'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const clazzRankFavourListSchema = require('./schema/clazzRankFavourList.schema');

const QUERY_SAFE_PARAMS = ['clazzRankId', 'userId', 'favourAt'];
const QUERY_SELECT_COLUMNS = ['id', 'clazzRankId', 'userId', 'favourAt'];

const pub = {};

/**
 * 新建一个点赞
 *
 * @param clazzRankFavourItem
 * @returns {*}
 */
pub.create = (clazzRankFavourItem) => {
  // 参数检查
  if (!_.isPlainObject(clazzRankFavourItem) || !_.isNil(clazzRankFavourItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(clazzRankFavourItem);

  return clazzRankFavourListSchema.create(clazzRankFavourItem);
};

/**
 * 查询所有点赞记录
 *
 * @param queryParam
 * @returns {*}
 */
pub.queryAll = (queryParam) => {
  const queryBuilder = (query) => {
    queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS)
  };

  return clazzRankFavourListSchema.findAll(queryBuilder, QUERY_SELECT_COLUMNS);
};

module.exports = pub;
