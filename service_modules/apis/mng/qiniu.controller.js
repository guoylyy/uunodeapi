'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const systemConfig = require('../../../config/config');
const requestUtil = require('../util/request.util');
const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const qiniuSchema = require('./schema/qiniu.schema');
const qiniuComponent = require('../../services/component/qiniu.component');
const commonUtil = require('../../services/util/common.util');

const attachService = require('../../services/attach.service');

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

        let qiniuTokenObj = qiniuComponent.fileTokenBodyHandler(tokenBody, systemConfig.MNG_BASE_QINIU_CALLBACK_URL);

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
  const body = req.body,
      auth = req.header('Authorization');

  debug(body);
  debug(auth);

  if (!qiniuComponent.isCallbackValid(systemConfig.MNG_BASE_QINIU_CALLBACK_URL, body, auth)) {
    winston.error("回调验证失败");
    return apiRender.renderParameterError(res, '验证回调失败');
  }

  let attach = {
    name: body.name,
    key: body.key,
    size: body.fsize,
    attachType: body.attachType,
    fileType: body.fileType,
    mimeType: body.mimeType
  };

  debug(attach);
  attachService.createAttach(attach)
      .then((attachItem) => {
        debug(attachItem);

        let pickeAttachItem = _.pick(attachItem, ['id', 'name', 'attachType', 'url']);

        return apiRender.renderBaseResult(res, pickeAttachItem);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
