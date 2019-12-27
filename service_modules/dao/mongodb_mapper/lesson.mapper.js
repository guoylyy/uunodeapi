"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require("lodash");
const debug = require("debug")("mapper");

const lessonSchema = require("./schema/lesson.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");

const QUERY_SAFE_PARAMS = ["_id", "type"];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  "type",
  "image",
  "isHot",
  "isTop",
  "linkType",
  "createAt",
  "linkUrl"
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([
  { column: "isTop", isDescending: true },
  { column: "isHot", isDescending: true },
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
pub.queryPagedLessonList = (queryParam, pageNumber = 1, pageSize = 10) => {
  debug(queryParam);
  return lessonSchema.queryPaged(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    pageNumber,
    pageSize,
    QUERY_ORDER_BY
  );
};

/**
 * 根据课程id获取课程详情
 */
pub.findById = (lessonId) => {
  return lessonSchema.findItemById(lessonId)
}

module.exports = pub;
