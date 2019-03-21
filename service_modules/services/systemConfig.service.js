'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const systemConfigMapper = require('../dao/mysql_mapper/systemConfig.mapper');

const pub = {};

/**
 * 获取type类型的参数配置
 *
 * @param type
 * @returns {Promise.<*>}
 */
pub.fetchSystemConfigByType = (type) => {
  if (_.isNil(enumModel.getEnumByKey(type, enumModel.systemConfigTypeEnum))) {
    winston.error('查询系统配置失败，参数错误： type: %s', type);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return systemConfigMapper.fetchAllByParam({ type: type })
      .then((configList) => {
        const configMap = _.reduce(
            configList,
            (prev, configItem) => {
              prev[configItem.key] = configItem.value;

              return prev;
            },
            {}
        );

        debug(configMap);

        return configMap;
      });
};

module.exports = pub;
