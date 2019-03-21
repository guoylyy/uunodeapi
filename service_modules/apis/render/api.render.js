'use strict';

const systemResult = require('./../../services/model/system.result');
const commonError = require('./../../services/model/common.error');

/**
 * 基本的错误返回
 * @param res
 * @param error
 */
function renderError(res, error) {
  if (!error) {
    error = new systemResult.BaseError();
  }

  if (!error.code || error.code < 400 || error.code >= 600) {
    error.code = 500;
  }

  res.status(error.code).json(error);
}

/**
 * 返回404
 * @param res
 */
function renderNotFound(res) {
  return renderError(res, commonError.NOT_FOUND_ERROR());
}

/**
 * 返回权限不足
 * @param res
 */
function renderUnauthorized(res) {
  return renderError(res, commonError.UNAUTHORIZED_ERROR());
}

/**
 * 返回未登录错误
 * @param res
 */
function renderLoginRequired(res) {
  return renderError(res, commonError.LOGIN_REQUIRED_ERROR());
}

/**
 * 返回参数错误
 * @param res
 * @param message
 */
function renderParameterError(res, message) {
  return renderError(res, commonError.PARAMETER_ERROR(message));
}

/**
 * 返回业务处理失败
 * @param res
 */
function renderBizFail(res) {
  return renderError(res, commonError.BIZ_FAIL_ERROR());
}

/**
 * 操作成功
 * @param res
 */
function renderSuccess(res) {
  return renderBaseResult(res, true);
}

/**
 * 基本的数据返回
 * @param res
 * @param data
 */
function renderBaseResult(res, data) {
  return renderResult(res, new systemResult.BaseResult(200, '操作成功', data))
}

/**
 * 基本的分页结构数据
 * @param res
 * @param values
 * @param itemSize
 * @param pageSize
 * @param curPage
 */
function renderPageResult(res, values, itemSize, pageSize, curPage) {
  return renderResult(res, new systemResult.PageResult(values, itemSize, pageSize, curPage));
}

/**
 * 返回结果
 * @param res
 * @param result
 */
function renderResult(res, result) {
  res.status(200).json(result);
}

exports.renderError = renderError;
exports.renderLoginRequired = renderLoginRequired;
exports.renderUnauthorized = renderUnauthorized;
exports.renderNotFound = renderNotFound;
exports.renderParameterError = renderParameterError;
exports.renderBizFail = renderBizFail;
exports.renderSuccess = renderSuccess;
exports.renderBaseResult = renderBaseResult;
exports.renderPageResult = renderPageResult;
