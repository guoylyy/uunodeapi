// web API 中间件
'use strict';

const systemLog = require('../lib/system.log');

let pub = {};

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
  req.__MODULE_LOGGER = systemLog.getLogger('web', req.__CURRENT_USER.id);
  next();
};

module.exports = pub;
