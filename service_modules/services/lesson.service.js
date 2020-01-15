"use strict";

const _ = require("lodash");
const winston = require("winston");
const Promise = require("bluebird");
const debug = require("debug")("service");
const lessonMapper = require("../dao/mongodb_mapper/lesson.mapper");
const commonError = require("./model/common.error");

const pub = {};

/**
 * 分页查询课程列表
 */
pub.queryLessonList = queryParam => {
  queryParam.type && (queryParam.types = {
    $elemMatch : {$eq:queryParam.type}
  });
  queryParam.title && (queryParam.title = {
    $regex: RegExp(queryParam.title, 'i')
  })
  return lessonMapper.queryPagedLessonList(
    queryParam,
    queryParam.pageNumber,
    queryParam.pageSize
  );
};

pub.fetchById = lessonId => {
  if (_.isNil(lessonId)) {
    winston.error("获取课程详情失败，参数错误！！！ lessonId: %s", lessonId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return lessonMapper.findById(lessonId);
};

pub.createLesson = lesson => {
  return lessonMapper.createLesson(lesson);
}

pub.updateLesson = lesson => {
  return lessonMapper.updateLessonById(lesson);
}

pub.deleteLesson = lessonId => {
  return lessonMapper.deleteLessonById(lessonId);
}

module.exports = pub;
