"use strict";

/**
 * Created at Mar 4, 2020 20:58 by HuPeng
 * Defined CourseWare DAO
 */
const _ = require("lodash");

const courseWareSchema = require("./schema/course.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");

const QUERY_SAFE_PARAMS = ["_id"];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
    "seq",
    "type",
    "isDemo",
    "isPublish",
    "title"
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([
  { column: "createdAt", isDescending: true }
]);

const pub = {};

/**
 * Paged Query CourseWareList
 */
pub.queryPaged = (queryParam, pageNumber = 1, pageSize = 10) => {
  return courseWareSchema.queryPaged(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    pageNumber,
    pageSize,
    QUERY_ORDER_BY
  );
};

/**
 * Get CourseWare By CourseWareId
 */
pub.findById = (courseId) => {
  return courseWareSchema.findItemById(courseId)
}

/**
 * Create CourseWare
 */
pub.create = course => {
  return courseWareSchema.createItem(course);
}

/**
 * Update CourseWare By CourseWareId
 */
pub.updateById = course => {
  return courseWareSchema.updateItemById(course.id, course);
}

/**
 * Logic Delete CourseWare By CourseWareId
 */
pub.deleteById = course => {
  return courseWareSchema.destroyItem(course);
}

module.exports = pub;
