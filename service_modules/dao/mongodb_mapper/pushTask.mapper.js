"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require("lodash");
const debug = require("debug")("mapper");

const pushTaskSchema = require("./schema/pushTask.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");

const QUERY_SAFE_PARAMS = ["_id", "pushAt"];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  "taskId",
  "pushAt",
  "createAt",
  "updateAt"
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([
  { column: "createAt", isDescending: true }
]);

const pub = {};

/**
 * 分页列出推送任务
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedTaskList = (queryParam, pageNumber = 1, pageSize = 10) => {
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
  return pushTaskSchema.findItemByParam(queryParam, QUERY_SAFE_PARAMS);
};

module.exports = pub;
