// 笃师一对一API中间键

'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('middleware');
const winston = require('winston');

const systemLog = require('../lib/system.log');

const jwtUtil = require('./util/jwt.util');

const config = require('../../config/config');
const apiErrorHandler = require('./render/api.error.handler');
const apiRender = require('./render/api.render');

const userService = require('../services/user.service');

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
    winston.error('笃师需要重新登录！！！');
    return apiRender.renderLoginRequired(res);
  };

  const token = req.header('X-Auth-Token');

  if (_.isNil(token)) {
    return loginRequired();
  }

  // verifies secret and checks exp
  return jwtUtil.verify(token, config.jwt_one.secretKey, config.jwt_one.options)
      .then((teacherObj) => {
        debug(teacherObj);
        return userService.fetchById(teacherObj.teacherId);
      })
      .then((userItem) => {
        // 如果用户不存在，则需登录
        if (_.isNil(userItem)) {
          return loginRequired();
        }

        req.__CURRENT_USER = userItem;
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
  req.__MODULE_LOGGER = systemLog.getLogger('one', req.__CURRENT_USER.id);
  next();
};

module.exports = pub;
