'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const enumModel = require('../../services/model/enum');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');

const clazzService = require('../../services/clazz.service');

let pub = {};


/**
 * 根据班级状态分页列出课程
 * 当status为OPEN时，列出开放报名中的班级列表
 * 当status为PROCESSING时，列出当前用户正在进行中的班级
 * 当status为CLOSE时，列出当前用户已关闭的班级列表
 * @param req
 * @param res
 */
pub.queryClazzList = (req, res) => {
  // 1. 检出用户输入
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        return clazzService.queryClazzes(enumModel.clazzStatusEnum.PROCESSING.key, [], req.__CURRENT_USER.openId);
      })
      .then((clazzList) => {
        if (_.isEmpty(clazzList)) {
          return apiRender.renderUnauthorized(res);
        }

        // 筛选数据
        let pickedClazzList = _.map(clazzList, (clazzItem) => _.pick(clazzItem, ['id', 'name', 'description', 'status', 'banner', 'startDate', 'endDate', 'author']));

        // render数据
        return apiRender.renderBaseResult(res, pickedClazzList);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

module.exports = pub;
