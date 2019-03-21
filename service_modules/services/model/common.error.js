'use strict';

const systemResult = require('./system.result');

let pub = {};

/**
 * 参数错误， code 400
 * @param message
 * @returns {*|BaseError}
 * @constructor
 */
pub.PARAMETER_ERROR = (message) => {
  return new systemResult.BaseError(400, message || '参数错误');
};

/**
 * 权限不足，code 401
 * @param message
 * @returns {*|BaseError}
 * @constructor
 */
pub.UNAUTHORIZED_ERROR = (message) => {
  return new systemResult.BaseError(401, message || '权限不足');
};

/**
 * NOT FOUND，code 404
 * @param message
 * @returns {*|BaseError}
 * @constructor
 */
pub.NOT_FOUND_ERROR = (message) => {
  return new systemResult.BaseError(404, message || '对象不存在');
};

/**
 * 需要关注公众号， code 406
 * @param message
 * @returns {*|BaseError}
 * @constructor
 */
pub.REGISTER_REQUIRED = (message) => {
  return new systemResult.BaseError(406, message || '请关注Uband友班公众号');
};

/**
 * 业务处理失败, code 500
 * @param message
 * @returns {*|BaseError}
 * @constructor
 */
pub.BIZ_FAIL_ERROR = (message) => {
  return new systemResult.BaseError(500, message || '业务处理失败');
};

/**
 * 需要登录， code 555
 * @param message
 * @returns {*|BaseError}
 * @constructor
 */
pub.LOGIN_REQUIRED_ERROR = (message) => {
  return new systemResult.BaseError(555, message || '您需要登录');
};

module.exports = pub;
