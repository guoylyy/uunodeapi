'use strict';

/**
 * Created at Mar 3, 2020 21:21 by HuPeng
 * Defined Course Controller
 */
const _ = require('lodash');
const winston = require('winston');

const systemConfig = require('../../../config/config');
const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const qiniuSchema = require('./schema/qiniu.schema');
const courseSchema = require('./schema/course.schema');
const commonSchema = require("../common.schema");
const qiniuComponent = require('../../services/component/qiniu.component');
const commonUtil = require('../../services/util/common.util');
const courseService = require('../../services/course.service');

let pub = {};

/**
 * Query CourseList
 */
pub.queryCourse = (req, res) => {
  return schemaValidator
    .validatePromise(courseSchema.querySchema, req.query)
    .then(queryParam => {
      return courseService.queryPaged(queryParam);
    })
    .then(result => {
      //todo 缺少销量字段
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
 * Get Course
 */
pub.getCourse = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.courseId)
    .then(courseId => {
      return courseService.findById(courseId);
    })
    .then(course => {
      return apiRender.renderBaseResult(
        res,
        course
      );
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * Update Course
 */
pub.updateCourse = (req, res) => {
  req.body.id = req.params.courseId;
  schemaValidator
    .validatePromise(courseSchema.updateSchema, req.body)
    .then(course => {
      course.id = req.params.courseId;
      return courseService.updateById(course);
    })
    .then(() => {
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * Create Course
 */
pub.createCourse = (req, res) => {
  return schemaValidator
    .validatePromise(courseSchema.createSchema, req.body)
    .then(course => {
      return courseService.create(course);
    })
    .then(course => {
      return apiRender.renderBaseResult(res, course);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * Delete Course
 */
pub.deleteCourse = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.courseId)
    .then(courseId => {
      return courseService.deleteById(courseId);
    })
    .then(() => {
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

module.exports = pub;