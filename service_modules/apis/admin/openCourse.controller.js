'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const openCourseSchema = require('./schema/openCourse.chema');

const apiUtil = require('../util/api.util');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const openCourseService = require('../../services/openCourse.service');

const pub = {};

pub.createOpenCourse = (req, res) => {
  schemaValidator.validatePromise(openCourseSchema.openCouseCreateSchema, req.body)
      .then((openCourse) => {
        debug(openCourse);

        return openCourseService.createOpenCourseItem(openCourse);
      })
      .then((openCourseItem) => {
        debug(openCourseItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
