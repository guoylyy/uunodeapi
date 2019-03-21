'use strict';
// API中间键

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('middleware');
const winston = require('winston');
const moment = require('moment');

const jwtUtil = require('./util/jwt.util');

const systemLog = require('../lib/system.log');

const systemConfig = require('../../config/config');
const apiErrorHandler = require('./render/api.error.handler');
const apiRender = require('./render/api.render');

const schemaValidator = require('./schema.validator');
const commonSchema = require('./common.schema');

const adminService = require('../services/admin.service');
const userService = require('../services/user.service');
const clazzService = require('../services/clazz.service');
const couponService = require('../services/coupon.service');
const userWithdrawService = require('../services/userWithdraw.service');
const clazzExitService = require('../services/clazzExit.servie');

const enumModel = require('../services/model/enum');

let pub = {};

/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
pub.basicErrorHandler = (req, res, next) => {
  req.__ERROR_HANDLER = apiErrorHandler.basicErrorHandler(res);
  next();
};

/**
 * 解析json web token, 验证用户是否已经登录
 */
pub.parseAuthToken = (req, res, next) => {
  let loginRequired = (error) => {
    debug(error);
    winston.error('管理员需要重新登录！！！');
    return apiRender.renderLoginRequired(res);
  };

  const token = req.header('X-Auth-Token');

  if (_.isNil(token)) {
    return loginRequired();
  }

  // verifies secret and checks exp
  return jwtUtil.verify(token, systemConfig.jwt_admin.secretKey, systemConfig.jwt_admin.options)
      .then((adminObj) => {
        debug(adminObj);

        return adminService.fetchAdminById(adminObj.systemerId);
      })
      .then((adminItem) => {
        debug(adminItem);

        /*
         如果管理员不存在，则需登录
         */
        if (_.isNil(adminItem)) {
          throw new Error('admin login required');
        }

        req.__CURRENT_ADMIN = adminItem;

        // todo 加载systemer权限
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(loginRequired);
};

/**
 * 模块logger
 * 定义req.__MODULE_LOGGER来处理模块日志
 *
 * 依赖于req.__CURRENT_USER
 *
 * @param req
 * @param res
 * @param next
 */
pub.moduleLogger = (req, res, next) => {
  req.__MODULE_LOGGER = systemLog.getLogger('admin', req.__CURRENT_ADMIN.id);
  next();
};

/**
 * 预装载学员条目
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadUserItem = (req, res, next) => {
  let userId = req.params.userId;

  debug(userId);

  userService.fetchById(userId)
      .then((userItem) => {
        debug(userItem);

        if (_.isNil(userItem)) {
          winston.error('用户 %s 不存在！！！', userId);
          return apiRender.renderNotFound(res);
        }

        // 当前学员
        req.__CURRENT_USER_ITEM = userItem;

        next();

        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载当前课程，如果clazzId不存在，则报404错误
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadClazzItem = (req, res, next) => {
  let clazzId = req.params.clazzId;

  debug(clazzId);

  schemaValidator.validatePromise(commonSchema.mongoIdSchema, clazzId)
      .then((clazzId) => {
        return clazzService.fetchClazzById(clazzId);
      })
      .then((clazzItem) => {
        debug(clazzItem);

        // 如果班级不存在，则报NOT FOUND
        if (_.isNil(clazzItem)) {
          winston.error('课程 %s 不存在！！！', clazzId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ = clazzItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载优惠券信息，如果不存在，则报404错误
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadCouponItem = (req, res, next) => {
  const couponId = req.params.couponId;

  debug(couponId);

  schemaValidator.validatePromise(commonSchema.mysqlIdSchema, couponId)
      .then((couponId) => {
        return couponService.fetchCouponById(couponId);
      })
      .then((couponItem) => {
        debug(couponItem);

        // 如果优惠券不存在，则报NOT FOUND
        if (_.isNil(couponItem)) {
          winston.error('优惠券 %s 不存在！！！', couponId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_COUPON_ITEM = couponItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载用户提现信息，如果不存在，则报404错误
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadWitdrawItem = (req, res, next) => {
  const withdrawId = req.params.withdrawId;

  debug(withdrawId);

  schemaValidator.validatePromise(commonSchema.mysqlIdSchema, withdrawId)
      .then((withdrawId) => {
        return userWithdrawService.fetchUserWithdrawInfoById(withdrawId);
      })
      .then((withdrawIdItem) => {
        debug(withdrawIdItem);

        // 如果用户退款存在，则报NOT FOUND
        if (_.isNil(withdrawIdItem)) {
          winston.error('用户退款 %s 不存在！！！', withdrawId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_USER_WITHDRAW_ITEM = withdrawIdItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载退款用户信息
 *    必须在 preloadWitdrawItem 之后使用
 * @param req
 * @param res
 * @param next
 */
pub.preloadWithdrawUserItem = (req, res, next) => {
  userService.fetchById(req.__CURRENT_USER_WITHDRAW_ITEM.userId)
      .then((userItem) => {
        debug(userItem);

        req.__CURRENT_USER_WITHDRAW_USER_ITEM = userItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载管理员条目
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadAdminItem = (req, res, next) => {
  const adminId = req.params.adminId;

  return adminService.fetchAdminById(adminId)
      .then((adminItem) => {
        debug(adminItem);

        if (_.isNil(adminItem)) {
          return apiRender.renderNotFound(res);
        }

        // 设置当前要操作的管理员帐号
        req.__CURRENT_TARGET_ADMIN_ITEM = adminItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载退班申请
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<T>}
 */
pub.preloadClazzExitItem = (req, res, next) => {
  const clazzExitId = req.params.clazzExitId;

  debug(clazzExitId);

  return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, clazzExitId)
      .then((clazzExitId) => {
        return clazzExitService.fetchClazzExitById(clazzExitId);
      })
      .then((clazzExitItem) => {
        debug(clazzExitItem);

        if (_.isNil(clazzExitItem)) {
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ_EXIT_ITEM = clazzExitItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
