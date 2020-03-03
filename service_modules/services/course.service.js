"use strict";

/**
 * Created at Mar 3, 2020 17:46 by HuPeng
 * Defined Course Service
 */
const _ = require("lodash");
const Promise = require("bluebird");
const winston = require("winston");
const commonError = require("./model/common.error");
const enumModel = require("./model/enum");

const courseMapper = require("../dao/mongodb_mapper/course.mapper");
const teacherMapper = require("../dao/mongodb_mapper/clazzTeacher.mapper");

let pub = {};

/**
 * Paged Query CourseList
*/
pub.queryPaged = (queryParam = {}) => {
  queryParam.title &&
  (queryParam.title = {
    $regex: RegExp(queryParam.title, "i")
  });
  return courseMapper.queryPaged(
    queryParam || {},
    queryParam.pageNumber || 1,
    queryParam.pageSize || 10
  );
};

/**
 * Get Course By CourseId
 */
pub.findById = courseId => {
  if (_.isNil(courseId)) {
    winston.error("courseId can not be nil");
    return Promise.reject(
      commonError.PARAMETER_ERROR("courseId can not be nil")
    );
  }
  return courseMapper(courseId);
};

/**
 * Create Course
 */
pub.create = async course => {
  if (_.isNil(course)) {
    winston.error("course can not be nil");
    return Promise.reject(commonError.PARAMETER_ERROR("course can not be nil"));
  }
  if (_.isNil(course.clazzTeacherId)) {
    winston.error("clazzTeacherId can not be nil");
    return Promise.reject(commonError.PARAMETER_ERROR("clazzTeacherId can not be nil"));
  }
  const teacher = await teacherMapper.fetchById(course.clazzTeacherId)
  if (_.isNil(course.clazzTeacherId)) {
    winston.error(`teacher can not be found, teacherId: ${course.clazzTeacherId}`);
    return Promise.reject(commonError.PARAMETER_ERROR(`teacher can not be found, teacherId: ${course.clazzTeacherId}`));
  }
  course.clazzTeacherName = teacher.name;
  return courseMapper.create(course);
};

/**
 * Update Course By CourseId
 */
pub.updateById = course => {
  if (_.isNil(course)) {
    winston.error("course can not be nil");
    return Promise.reject(commonError.PARAMETER_ERROR("course can not be nil"));
  } else if (_.isNil(course.id)) {
    winston.error("courseId can not be nil");
    return Promise.reject(
      commonError.PARAMETER_ERROR("courseId can not be nil")
    );
  }
  return courseMapper.updateById(course);
};

/**
 * Delete Course By CourseId
 */
pub.deleteById = courseId => {
  if (_.isNil(courseId)) {
    winston.error("courseId can not be nil");
    return Promise.reject(
      commonError.PARAMETER_ERROR("courseId can not be nil")
    );
  }
  return courseMapper.deleteById(courseId);
};

module.exports = pub;
