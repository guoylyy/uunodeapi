"use strict";

const _ = require("lodash");
const schemaValidator = require("../schema.validator");
const commonSchema = require("../common.schema");
const lessonSchema = require("./schema/lesson.schema");
const apiRender = require("../render/api.render");
const lessonService = require("../../services/lesson.service");
const debug = require("debug")("controller");

const pub = {};
/**
 * 分页查询课程列表
 */
pub.getLessonList = (req, res) => {
  return schemaValidator
    .validatePromise(lessonSchema.queryLessonListSchema, req.query)
    .then(queryParam => {
      debug(queryParam);
      return lessonService.queryLessonList(queryParam);
    })
    .then(result => {
      return apiRender.renderPageResult(
        res,
        result.values,
        result.itemSize,
        result.pageSize,
        result.pageNumber
      );
    })
    .catch(req.__ERROR_HANDLER);
};

pub.getLesson = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.lessonId)
  .then(lessonId => {
    return lessonService.fetchById(lessonId);
  })
  .then(result => {
    return apiRender.renderBaseResult(res, result)
  })
};

pub.getBanners = (req, res) => {};

module.exports = pub;
