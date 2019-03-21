// API中间键
'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('middleware');
const winston = require('winston');
const moment = require('moment');

const systemLog = require('../lib/system.log');

const jwtUtil = require('./util/jwt.util');

const systemConfig = require('../../config/config');
const apiErrorHandler = require('./render/api.error.handler');
const apiRender = require('./render/api.render');

const schemaValidator = require('./schema.validator');
const commonSchema = require('./common.schema');

const adminService = require('../services/admin.service');
const clazzAccountService = require('../services/clazzAccount.service');
const userService = require('../services/user.service');

const enumModel = require('../services/model/enum');

const pub = {};

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
    winston.error('机器人需要重新登录！！！');
    return apiRender.renderLoginRequired(res);
  };

  const token = req.header('X-Auth-Token');

  if (_.isNil(token)) {
    return loginRequired();
  }

  // verifies secret and checks exp
  return jwtUtil.verify(token, systemConfig.jwt_robot_shark.secretKey, systemConfig.jwt_robot_shark.options)
      .then((adminObj) => {
        return adminService.fetchAdminById(adminObj.robotId);
      })
      .then((robotItem) => {
        debug(robotItem);
        // 1. 如果机器人不存在
        // 2. token不一致
        // 3. token已过期
        // 则需登录
        if (_.isNil(robotItem) || robotItem.authToken !== token || moment().isAfter(robotItem.authExpire)) {
          throw new Error('robot login required');
        }

        req.__CURRENT_ROBOT = robotItem;

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
  req.__MODULE_LOGGER = systemLog.getLogger('robot', req.__CURRENT_ROBOT.id);
  next();
};

/**
 * 预加载学员记录
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadStudentItem = (req, res, next) => {
  const studentNumber = req.params.studentNumber;

  debug(studentNumber);

  return userService.fetchByStudentNumber(studentNumber)
      .then((studentItem) => {
        if (_.isNil(studentItem)) {
          winston.error('学号为 %s 的用户不存在！！！', studentNumber);
          return apiRender.renderParameterError(res, '不存在的学员');
        }

        req.__CURRENT_STUDENT_USER_ITEM = studentItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
