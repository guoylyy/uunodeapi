"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require("lodash");
const debug = require("debug")("mapper");

const pushTaskSchema = require("./schema/pushTask.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");
const enumModel = require('../../services/model/enum');
const QUERY_SAFE_PARAMS = ["_id", "pushAt", "weappType"];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  "taskId",
  "pushAt",
  "createdAt",
  "updatedAt",
  "status"
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([
  { column: "pushAt", isDescending: true }
]);

const pub = {};

/**
 * 分页列出推送任务
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedPushTaskList = (queryParam, pageNumber = 1, pageSize = 10) => {
  debug(queryParam);
  return pushTaskSchema.queryPaged(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    pageNumber,
    pageSize, 
    QUERY_ORDER_BY
  );
};

pub.findByParam = (queryParam) => {
  queryParam.weappType = queryParam.weappType || enumModel.weappTypeEnum.KOUYI.key;
  return pushTaskSchema.findItemByParam(queryParam, QUERY_SAFE_PARAMS);
};

pub.createPushTask = pushTask => {
  // 默认状态待推送
  pushTask.status = enumModel.pushTaskStatusEnum.PENDING.key;
  return pushTaskSchema.createItem(pushTask);
}

/**
 * 删除推送
 */
pub.deleteById = pushTaskId => {
  return pushTaskSchema.destroyItem(pushTaskId);
}

/**
 * 根据参数查询已发布的推送列表
 */
pub.queryList = (queryParam) => {
  queryParam.status = enumModel.pushTaskStatusEnum.PUBLISHED.key;
  return pushTaskSchema.queryList(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    QUERY_ORDER_BY
  );
}

module.exports = pub;
