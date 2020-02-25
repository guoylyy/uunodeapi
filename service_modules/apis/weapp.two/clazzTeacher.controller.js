'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const apiUtil = require('../util/api.util');
const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');

const clazzTeacherService = require('../../services/clazzTeacher.service');

const pub = {};

/**
 * 获取笃师列表 -- 公开接口
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchAllTeacherList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzTeacherService.listAllClazzTeachers();
      })
      .then((teacherList) => {
        debug(teacherList);

        const pickedTeacherList = _.map(teacherList, apiUtil.pickClazzTeacherInfo);

        return apiRender.renderBaseResult(res, pickedTeacherList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取笃师详情 -- 公开接口
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchTeacherDetail = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.teacherId)
      .then((clzzTeacherId) => {
        debug(clzzTeacherId);

        return clazzTeacherService.fetchClazzTeacherById(clzzTeacherId);
      })
      .then((teacherItem) => {
        debug(teacherItem);

        if (_.isNil(teacherItem)) {
          return apiRender.renderNotFound(res);
        }

        const pickedTeacherItem = _.pick(
            teacherItem,
            ['id', 'name', 'headImgUrl', 'description', 'businessScope', 'introduction', 'priceConfig']
        );

        return apiRender.renderBaseResult(res, pickedTeacherItem);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
