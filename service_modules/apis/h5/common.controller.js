'use strict';

const debug = require('debug')('controller');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('./schema/common.schema');

const enumModel = require('../../services/model/enum');

const systemConfigService = require('../../services/systemConfig.service');

const pub = {};

/**
 * 获取app版本信息
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchAppVersion = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.appVersionSchema, req.query)
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

module.exports = pub;
