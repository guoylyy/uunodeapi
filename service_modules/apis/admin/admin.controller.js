'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const adminSchema = require('./schema/admin.schema.js');
const commonSchema = require('../common.schema');

const systemConfig = require('../../../config/config');
const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const apiUtil = require('../util/api.util');
const jwtUtil = require('../util/jwt.util');

const adminService = require('../../services/admin.service');
const clazzService = require('../../services/clazz.service');

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

        debug(adminItem);

        if (!globalAdmin || globalAdmin.role !== enumModel.systemerTypeEnum.ADMIN.key) {
          return Promise.reject(commonError.UNAUTHORIZED_ERROR('用户名与密码不匹配'));
        }

        const adminObj = { systemerId: globalAdmin.id };

        return jwtUtil.sign(adminObj, systemConfig.jwt_admin.secretKey, systemConfig.jwt_admin.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickAdminInfo(globalAdmin));
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
 * 新建管理员
 *
 * @param req
 * @param res
 */
pub.createAdmin = (req, res) => {
  schemaValidator.validatePromise(adminSchema.createAdminBodySchema, req.body)
      .then((admin) => {
        return adminService.createAdmin(admin);
      })
      .then((adminItem) => {
        debug(adminItem);
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 * 检查token是否有效
 *
 * @param req
 * @param res
 */
pub.checkAuth = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 分页获取管理员列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchPagedAdmins = (req, res) => {
  return schemaValidator.validatePromise(adminSchema.queryAdminListSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return adminService.fetchPagedAdmins(queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedAdmins) => {
        debug(pagedAdmins);

        const pickedAdminList = _.map(pagedAdmins.values, (clazzItem) => _.pick(clazzItem, ['id', 'name', 'phoneNumber', 'headImgUrl', 'role']));

        return apiRender.renderPageResult(res, pickedAdminList, pagedAdmins.itemSize, pagedAdmins.pageSize, pagedAdmins.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取管理员有权限的班级列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchAdminPermittedClazzList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return adminService.fetchAdminPermissions(req.__CURRENT_TARGET_ADMIN_ITEM.id);
      })
      .then((adminPermission) => {
        debug(adminPermission);

        const clazzIdList = _.keys(adminPermission[enumModel.permissionTypeEnum.CLAZZ_PERMISSION.key]);

        return clazzService.queryClazzes(null, clazzIdList, null, null);
      })
      .then((clazzList) => {
        const pickedClazzList = _.map(clazzList, apiUtil.pickClazzBasicInfo);

        return apiRender.renderBaseResult(res, pickedClazzList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 设置管理员班级权限
 * 现为班级级别控制
 *
 * @param req
 * @param res
 */
pub.resetAdminClazzPermission = (req, res) => {
  schemaValidator.validatePromise(adminSchema.adminClazzPermissionSchema, req.body)
      .then((clazzPermission) => {
        debug(clazzPermission);

        return adminService.setAdminClazzPermission(req.__CURRENT_TARGET_ADMIN_ITEM.id, clazzPermission.clazzIds);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
