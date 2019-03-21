"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');

const clazzTaskSchema = require('./schema/clazzTask.schema');
const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const QUERY_SAFE_PARAMS = ['clazz', '_id', 'targetDate', 'dayNumber', 'title', 'isDelete'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['title', 'author', 'teacher', 'shareType', 'coverPic', 'targetDate', 'dayNumber', 'materials', 'updatedAt', 'introductionMaterialList']);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);
// 限制可更新的字段
const UPDATE_SAFE_PARAM_LIST = ['title', 'author','coverPic', 'shareType', 'teacher', 'materials', 'introductions', 'introductionMaterialList'];

const pub = {};

/**
 * 查询班级任务列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryClazzTaskList = (queryParam) => {
  return clazzTaskSchema.queryList(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_ORDER_BY);
};

/**
 * 分页列出班级任务
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedClazzTaskList = (queryParam, pageNumber, pageSize) => {
  return clazzTaskSchema.queryPaged(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_ORDER_BY);
};

/**
 * 根据id获取任务详情
 *
 * @param taskId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (taskId) => {
  return clazzTaskSchema.findItemById(taskId);
};

/**
 * 创建课程任务
 *
 * @param taskItem
 * @returns {*|Promise.<TResult>|Promise}
 */
pub.create = (taskItem) => {
  return clazzTaskSchema.createItem(taskItem);
};

/**
 * 更新课程任务
 *
 * @param taskId
 * @param taskItem
 * @returns {Promise.<TResult>}
 */
pub.update = (taskId, taskItem) => {
  const pickedTaskItem = mongoUtil.pickUpdateParams(taskItem, UPDATE_SAFE_PARAM_LIST);

  debug(taskId);
  debug(pickedTaskItem);

  return clazzTaskSchema.updateItemById(taskId, pickedTaskItem);
};

/**
 * 删除课程任务
 *
 * @param taskId
 * @returns {Promise.<TResult>}
 */
pub.destroy = (taskId) => {
  return clazzTaskSchema.destroyItem(taskId);
};

module.exports = pub;
