"use strict";

const _ = require("lodash");
const schemaValidator = require("../../schema.validator");
const commonSchema = require("../../common.schema");
const pagedBaseSchema = require("../schema/paged.base.schema");
const apiRender = require("../../render/api.render");
const enumModel = require("../../../services/model/enum");
const lessonService = require("../../../services/lesson.service");
const lessonSchema = require("../schema/lesson.schema");
const pub = {};

/**
 * 获取文章
 * 按时间倒序 分页
 */
pub.getLessonList = (req, res) => {
  return schemaValidator
    .validatePromise(lessonSchema.pagedSchema, req.query)
    .then(queryParam => {
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

/**
 * 获取文章详情
 */
pub.getLesson = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.lessonId)
    .then(() => {
      return apiRender.renderBaseResult(res, req.__LESSON_ITEM)
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 删除文章
 */
pub.deleteLesson = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.lessonId)
    .then(lessonId => {
      return lessonService.deleteLesson(lessonId);
    })
    .then(result => {
      return _.isNil(result)
      ? apiRender.renderParameterError(res, "删除失败")
      : apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 创建文章
 */
pub.createLesson = (req, res) => {
  return schemaValidator
    .validatePromise(lessonSchema.createLessonSchema, req.body)
    .then(lesson => {
      return lessonService.createLesson(lesson);
    })
    .then(lesson => {
      console.log(lesson);
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 更新文章
 */
pub.updateLesson = (req, res) => {
  return schemaValidator
    .validatePromise(lessonSchema.createLessonSchema, req.body)
    .then(lesson => {
      lesson.id = req.params.lessonId;
      return lessonService.updateLesson(lesson);
    })
    .then(result => {
      return _.isNil(result)
        ? apiRender.renderParameterError(res, "更新失败")
        : apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
