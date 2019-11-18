"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const templateReplySchema = require('./schema/wordSaveByUser.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

const QUERY_SAFE_PARAMS = ['word', 'userId'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['word',
  'symbol_en', 'symbol_am', 'symbol_en_pro', 'symbol_am_pro', 'userId', 'createdAt', 'updatedAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{column: 'createdAt', isDescending: true}]);

/**
 * 查询满足条件的模板
 *
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return templateReplySchema.queryList(queryParam, QUERY_SAFE_PARAMS,
      QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 删除
 */
pub.deleteById = (saveId) => {
  return templateReplySchema.destroyItem(saveId);
};

module.exports = pub;
