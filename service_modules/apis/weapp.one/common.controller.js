'use strict';

/**
 * 用户相关API
 */

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const commonSchema = require('../common.schema');
const enumModel = require('../../services/model/enum');
const schoolService = require('../../services/school.service');

const pub = {};

/**
 * 查询学校
 *
 * @param req
 * @param res
 */
pub.querySchools = (req, res) =>{
  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((queryParam) =>{
        return schoolService.querySchool(req.query.name);
      })
      .then((schools) => {
        return apiRender.renderBaseResult(res, schools);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
