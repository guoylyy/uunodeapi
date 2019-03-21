"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');

const materialSchema = require('./schema/materialLibrary.schema');
const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const QUERY_SAFE_PARAMS = ['clazz', '_id', 'type', 'title'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['title', 'description', 'type', 'attach', 'updatedAt']);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

const pub = {};

/**
 * 查询班级素材列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryMaterialList = (queryParam) => {
  return materialSchema.queryList(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_ORDER_BY);
};

/**
 * 分页列出班级素材
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedMaterialList = (queryParam, pageNumber = 1, pageSize = 10) => {
  debug(queryParam);

  return materialSchema.queryPaged(queryParam, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_ORDER_BY);
};


/**
 * 创建课程任务素材
 *
 * @param materialItem
 * @returns {*|Promise.<TResult>|Promise}
 */
pub.create = (materialItem) => {
  return materialSchema.createItem(materialItem);
};

/**
 * 一次创建多个任务素材
 *
 * @param materialItems
 * @returns {*|Promise.<TResult>|Promise}
 */
pub.createAll = (materialItems) => {
  debug(materialItems);

  _.forEach(materialItems, (materialItem) => {
    // 获取当前日期
    let currentDate = new Date();

    // 设置createdAt为当前时间
    materialItem.createdAt = currentDate;
    // 更新updatedAt字段
    materialItem.updatedAt = currentDate;
  });

  return materialSchema.insertMany(materialItems)
      .then((materialItems) => {
        debug(materialItems);

        return _.map(materialItems, mongoUtil.leanId);
      });
};

/**
 * 删除课程任务素材
 * 假删除
 *
 * @param materialId
 * @returns {Promise.<TResult>}
 */
pub.destroy = (materialId) => {
  return materialSchema.destroyItem(materialId);
};

module.exports = pub;
