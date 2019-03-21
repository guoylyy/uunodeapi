'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const apiRender = require('./api.render');

let pub = {};

/**
 * 基本的错误处理函数生成器
 * @param res
 */
pub.basicErrorHandler = (res) => (error) => {
  debug(error);
  winston.error(error);

  let appError = {};
  // 检查code
  if (!_.isSafeInteger(error.code) || error.code < 400 || error.code > 599) {
    appError.code = 500;
  } else {
    appError.code = error.code;
  }
  // 设置message
  appError.message = error.message || '未知错误';

  debug(appError);
  return apiRender.renderError(res, appError);
};

module.exports = pub;
