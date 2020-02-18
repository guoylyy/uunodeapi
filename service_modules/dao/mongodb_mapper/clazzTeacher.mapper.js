"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const ClazzTeacherSchema = require('./schema/clazzTeacher.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

const QUERY_SAFE_PARAMS = ['_id', 'isAvailable'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['name', 'headImgUrl', 'description', 'businessScope', 'gender', 'tags', 'followUserCount', 'clazzStudentCount']);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: 'sortOrder', isDescending: false }]);

/**
 * 查询班级任务列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryClazzTeacherList = (queryParam) => {
  return ClazzTeacherSchema.queryList(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_ORDER_BY);
};

/**
 * 根据id获取任务详情
 *
 * @param taskId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (taskId) => {
  return ClazzTeacherSchema.findItemById(taskId);
};

/**
 * 分页列出笃师笃友评论
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedClazzTeacherList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return ClazzTeacherSchema.queryPaged(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_ORDER_BY);
};

/**
 *
 * @param clazzTeacherId
 * @param clazzTeacherItem
 * @returns {Promise.<TResult>}
 */
pub.update = (clazzTeacherId, clazzTeacherItem) => {
  return ClazzTeacherSchema.updateItemById(clazzTeacherId, clazzTeacherItem)
};

/**
 *
 * @param item
 * @return {item}
 */
pub.create = (item) =>{
  return ClazzTeacherSchema.create(item);
};

module.exports = pub;
