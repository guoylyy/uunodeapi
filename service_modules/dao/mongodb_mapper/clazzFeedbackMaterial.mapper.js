"use strict";

/**
 * clazz数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const clazzFeedbackMaterialSchema = require('./schema/clazzFeedbackMaterial.schema');
const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const QUERY_SAFE_PARAM_LIST = ['clazz', '_id', 'title'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['title', 'author', 'updatedAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);
const UPDATE_SAFE_PARAM_LIST = ['title', 'author', 'content']; // 限制可更新的字段

const pub = {};

/**
 * 查询笃师一对一反馈素材列表
 *
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return clazzFeedbackMaterialSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 分页查询笃师一对一素材列表
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.pageQuery = (queryParam, pageNumber = 1, pageSize = 10) => {
  return clazzFeedbackMaterialSchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY);
};

/**
 * 根据id获取素材详情
 *
 * @param materialId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (materialId) => {
  return clazzFeedbackMaterialSchema.findItemById(materialId);
};

/**
 * 根据id将checkin更新为materialItem中的信息
 * @param materialId
 * @param feedbackMaterialItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (materialId, feedbackMaterialItem) => {
  const pickedMaterialItem = mongoUtil.pickUpdateParams(feedbackMaterialItem, UPDATE_SAFE_PARAM_LIST);

  debug(materialId, pickedMaterialItem);

  return clazzFeedbackMaterialSchema.updateItemById(materialId, pickedMaterialItem);
};

/**
 * 根据id删除checkin条目
 * @param materialId
 * @returns {Promise.<TResult>}
 */
pub.destroy = (materialId) => {
  return clazzFeedbackMaterialSchema.destroyItem(materialId);
};

/**
 * 创建打卡记录
 *
 * @param materialItem
 * @returns {materialItem}
 */
pub.create = (materialItem) => {
  return clazzFeedbackMaterialSchema.createItem(materialItem);
};

module.exports = pub;
