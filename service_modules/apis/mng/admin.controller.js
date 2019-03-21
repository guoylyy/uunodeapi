'use strict';

const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const adminSchema = require('./schema/admin.schema.js');
const commonSchema = require('../common.schema');

const systemConfig = require('../../../config/config');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const jwtUtil = require('../util/jwt.util');
const apiUtil = require('../util/api.util');

const adminService = require('../../services/admin.service');

const pub = {};

/**
 * API: POST /user/auth
 * 账户登录，用户认证
 *
 * @param req
 * @param res
 */
pub.auth = (req, res) => {
  let globalAdmin;
  schemaValidator.validatePromise(adminSchema.adminLoginBodySchema, req.body)
      .then((admin) => {
        return adminService.adminLogin(admin.phoneNumber, admin.password)
      })
      .then((adminItem) => {
        globalAdmin = adminItem;
        if (!globalAdmin) {
          return apiRender.renderError(res, commonError.UNAUTHORIZED_ERROR('用户名与密码不匹配'));
        }

        const adminObj = { adminId: globalAdmin.id };

        return jwtUtil.sign(adminObj, systemConfig.jwt_mng.secretKey, systemConfig.jwt_mng.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              // 获取权限列表
              const fetchPermissionPromise = adminService.fetchAdminPermissions(globalAdmin.id);

              const updateAdminAUthPromise = adminService.updateAdmin({
                id: globalAdmin.id,
                authToken: token,
                authExpire: moment().add('7', 'days').toDate()
              });

              return Promise.all([fetchPermissionPromise, updateAdminAUthPromise]);
            });
      })
      .then((results) => {
        debug(results);

        const permissions = results[0],
            pickedAdmin = apiUtil.pickAdminInfo(globalAdmin);

        pickedAdmin.permissions = permissions;

        return apiRender.renderBaseResult(res, pickedAdmin);
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
  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((deAuthBody) => {
        debug(deAuthBody);

        return adminService.updateAdmin({
          id: req.__CURRENT_ADMIN.id,
          authToken: null,
          authExpire: new Date()
        });
      })
      .then((adminItem) => {
        debug(adminItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新密码
 *
 * @param req
 * @param res
 */
pub.updateAdminPassword = (req, res) => {
  schemaValidator.validatePromise(adminSchema.updateAdminPasswordBodySchema, req.body)
      .then((updatePassword) => {
        debug(updatePassword);

        return adminService.updateAdminPasswordByOldPassword(req.__CURRENT_ADMIN, updatePassword.oldPassword, updatePassword.password);
      })
      .then(() => {
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
