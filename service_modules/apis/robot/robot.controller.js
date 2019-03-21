'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const robotSchema = require('./schema/robot.schema.js');
const commonSchema = require('../common.schema');

const systemConfig = require('../../../config/config');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const jwtUtil = require('../util/jwt.util');
const apiUtil = require('../util/api.util');

const adminService = require('../../services/admin.service');

const enumModel = require('../../services/model/enum');

const pub = {};

/**
 * API: POST /user/auth
 * 账户登录，用户认证
 *
 * @param req
 * @param res
 */
pub.auth = (req, res) => {
  return schemaValidator.validatePromise(robotSchema.loginBodySchema, req.body)
      .then((robot) => {
        return adminService.adminLogin(robot.account, robot.password)
      })
      .then((robotItem) => {

        if (_.isNil(robotItem) || enumModel.systemerTypeEnum.ROBOT.key !== robotItem.role) {
          return apiRender.renderError(res, commonError.UNAUTHORIZED_ERROR('用户名与密码不匹配'));
        }

        const toSiginRobot = { robotId: robotItem.id };

        const jwtOptions = systemConfig.jwt_robot_shark.options;
        return jwtUtil.sign(toSiginRobot, systemConfig.jwt_robot_shark.secretKey, jwtOptions)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return adminService.updateAdmin({
                id: robotItem.id,
                authToken: token,
                authExpire: moment().add('1', 'days').toDate()
              });
            })
            .then(() => {
              return apiRender.renderBaseResult(res, {id: robotItem.id});
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户登出
 *
 * @param req
 * @param res
 */
pub.deAuth = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((requestBody) => {
        debug(requestBody);

        return adminService.updateAdmin({
          id: req.__CURRENT_ROBOT.id,
          authToken: null,
          authExpire: new Date()
        });
      })
      .then((robotItem) => {
        debug(robotItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 检查token是否有效
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.checkAuth = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
