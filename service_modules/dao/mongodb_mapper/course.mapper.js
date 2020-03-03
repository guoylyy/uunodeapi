"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require("lodash");
const debug = require("debug")("mapper");

const courseSchema = require("./schema/course.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");

const QUERY_SAFE_PARAMS = ["_id", "clazzTeacherId", "status", "title"];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  "title",
  "clazzTeacherName",
  "courseHours",
  "price",
  "status",
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([
  { column: "createdAt", isDescending: true }
]);

const pub = {};

/**
 * CourseList 分页
 */
pub.queryPaged = (queryParam, pageNumber = 1, pageSize = 10) => {
  return courseSchema.queryPaged(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    pageNumber,
    pageSize,
    QUERY_ORDER_BY
  );
};

/**
 * 根据Course ID获取Course
 */
pub.findById = (courseId) => {
  return courseSchema.findItemById(courseId)
}

/**
 * 创建Course
 */
pub.create = course => {
  return courseSchema.createItem(course);
}

/**
 * 更新Course
 */
pub.updateById = course => {
  return courseSchema.updateItemById(course.id, course);
}

/**
 * 删除Course
 */
pub.deleteById = courseId => {
  return courseSchema.destroyItem(courseId);
}

module.exports = pub;