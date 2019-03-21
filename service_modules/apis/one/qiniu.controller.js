'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const systemConfig = require('../../../config/config');

const schemaValidator = require('../schema.validator');
const qiniuSchema = require('./schema/qiniu.schema');
const requestUtil = require('../util/request.util');

const apiRender = require('../render/api.render');

const userFileService = require('../../services/userFile.service');

const qiniuComponent = require('../../services/component/qiniu.component');

let pub = {};

/**
 * 获取七牛上传文件token
 *
 * @param req
 * @param res
 */
pub.fetchQiniuUploadToken = (req, res) => {
  return requestUtil.compactFileNamePromise(req.body)
      .then((requestBody) => schemaValidator.validatePromise(qiniuSchema.qiniuTokenBodySchema, requestBody))
      .then((tokenBody) => {
        debug(tokenBody);

        let qiniuTokenObj = qiniuComponent.fileTokenBodyHandler(tokenBody, systemConfig.ONE_BASE_QINIU_CALLBACK_URL, req.__CURRENT_USER.id);

        debug(qiniuTokenObj);

        return apiRender.renderBaseResult(res, qiniuTokenObj);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 七牛回调处理器
 *
 * @param req
 * @param res
 * @returns {*}
 */
pub.qiniuCallbackHandler = (req, res) => {
  const callbackBody = req.body,
      auth = req.header('Authorization'),
      userId = parseInt(req.body.userId);

  debug(callbackBody);
  debug(auth);

  if (!qiniuComponent.isCallbackValid(systemConfig.ONE_BASE_QINIU_CALLBACK_URL, callbackBody, auth)) {
    winston.error("回调验证失败");
    return apiRender.renderParameterError(res, '验证回调失败');
  }

  return userFileService.saveQiniuFileAsUserFile(userId, callbackBody)
      .then((results) => {
        debug(results);

        let attachItem = results[0];

        debug(attachItem);

        return apiRender.renderBaseResult(res, _.pick(attachItem, ['id', 'name', 'attachType', 'url']));
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
