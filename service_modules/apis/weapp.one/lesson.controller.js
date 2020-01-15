"use strict";

const _ = require("lodash");
const schemaValidator = require("../schema.validator");
const commonSchema = require("../common.schema");
const lessonSchema = require("./schema/lesson.schema");
const apiRender = require("../render/api.render");
const lessonService = require("../../services/lesson.service");
const bannerService = require("../../services/banner.service");
const debug = require("debug")("controller");
const enumModel = require('../../services/model/enum');
const bannerBizTypeEnum = enumModel.bannerBizTypeEnum;
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
  .then(lesson => {
    if (_.isNil(lesson) || _.isEqual(lesson.status, 'PENDING')) {
      return apiRender.renderNotFound(res);
    }
    const updateLesson = {id: lesson.id, views: (lesson.views || 0) + 1}
    lessonService.updateLesson(updateLesson);
    return apiRender.renderBaseResult(res, lesson)
  })
  .catch(req.__ERROR_HANDLER);
};

/**
 * 获取banner列表
 */
pub.getBanners = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.emptySchema, req.query)
    .then(() => {
      return bannerService.queryBannerList(bannerBizTypeEnum.LESSON.key)
    })
    .then(result => {
      return apiRender.renderBaseResult(res, result);
    })
    .catch(req.__ERROR_HANDLER);;
};

module.exports = pub;
