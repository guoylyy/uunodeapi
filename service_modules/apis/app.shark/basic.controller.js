'use strict';

/**
 * shark app 微信相关处理API
 */
const _ = require('lodash');
const debug = require('debug')('controller');

const systemConfig = require('../../../config/config');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const basicSchema = require('./schema/basic.schema');
const commonSchema = require('../common.schema');

const enumModel = require('../../services/model/enum');

const systemConfigService = require('../../services/systemConfig.service');

const pub = {};

pub.fetchAppVersion = (req, res) => {
  return schemaValidator.validatePromise(basicSchema.appVersionSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const configType = queryParam.platform === enumModel.appTypeEnum.ANDROID.key
            ? enumModel.systemConfigTypeEnum.APP_VERSION_ANDROID.key
            : enumModel.systemConfigTypeEnum.APP_VERSION_IOS.key;

        return systemConfigService.fetchSystemConfigByType(configType);
      })
      .then((versionConfig) => {
        debug(versionConfig);

        return apiRender.renderBaseResult(res, versionConfig);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.fetchIsAudit = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(res, _.get(systemConfig, ['APP_RELEASE_CONFIG', 'isAudit'], true) === true)
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
