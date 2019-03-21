"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const clazzTeacherCommendSchema = require('./schema/clazzTeacherCommend.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

const QUERY_SAFE_PARAMS = ['clazzTeacher'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['_id', 'userId', 'clazzTeacher', 'clazzName', 'commend']);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: 'createdAt', isDescending: true }]);

/**
 * 分页列出笃师笃友评论
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedClazzTeacherCommendList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return clazzTeacherCommendSchema.queryPaged(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_ORDER_BY);
};

/**
 * 新建笃师的笃友评论
 *
 * @param commendItem
 */
pub.create = (commendItem) => {
  return clazzTeacherCommendSchema.createItem(commendItem);
};

module.exports = pub;
