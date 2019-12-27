"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require("lodash");
const debug = require("debug")("mapper");

const taskCheckinSchema = require("./schema/taskCheckin.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");
const winston = require("winston");
const QUERY_SAFE_PARAMS = ["_id", "userId", "task"];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  "title",
  "attach",
  "task",
  "userId",
  "createAt"
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([
  { column: "createAt", isDescending: true }
]);

const pub = {};

/**
 * 分页列出课程列表
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedTaskList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return taskCheckinSchema.queryPaged(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    pageNumber,
    pageSize,
    QUERY_ORDER_BY
  );
};

/**
 * 创建打卡
 */
pub.checkin = (taskCheckin) => {
  return taskCheckinSchema.createItem(taskCheckin);
}

module.exports = pub;
