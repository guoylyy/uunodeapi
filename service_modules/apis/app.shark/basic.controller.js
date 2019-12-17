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

/**
 * 获取APP的版本号
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
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

/**
 *
 * @param req
 * @param res
 * @return {Bluebird<R>}
 */
pub.fetchIsAudit = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(res, _.get(systemConfig, ['APP_RELEASE_CONFIG', 'isAudit'], true) === true)
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 根据Type获取系统配置
 */
pub.fetchSystemConfig = (req, res)=> {
  return schemaValidator.validatePromise(basicSchema.fetchSysconfigSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        let sysconfigType = queryParam['sysconfigType'];

        if(sysconfigType != enumModel.systemConfigTypeEnum.APP_SERVICE_CONFIG.key &&
            sysconfigType != enumModel.systemConfigTypeEnum.APP_CARD_CONFIG.key){
          return Promise.reject(commonError.PARAMETER_ERROR('不支持的配置类型'));
        }

        return systemConfigService.fetchSystemConfigByTypeAndKey(sysconfigType, queryParam['key']);
      })
      .then((configs) => {
        debug(configs);
        if(_.isArray(configs) && _.size(configs) > 0){
          let config = configs[0];
          let result = _.pick(config,['type','key','value']);
          return apiRender.renderBaseResult(res, result);
        }else{
          return apiRender.renderNotFound(res);
        }
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
