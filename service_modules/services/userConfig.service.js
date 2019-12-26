'use strict';

const userConfigMapper = require('../dao/mysql_mapper/userConfig.mapper');

let pub = {};

/**
 * 查询配置列表
 * @param name
 */
pub.queryUserConfigByApp = (userId, configApp) => {
  let params = {
    'userId': userId,
    'configApp': configApp
  };
  return userConfigMapper.queryAll(params);
};

/**
 * 查询配置列表
 * @param name
 */
pub.queryUserConfigByType = (userId, configApp, configType) => {
  let params = {
    'userId': userId,
    'configApp': configApp,
    'configType': configType
  };
  return userConfigMapper.queryAll(params);
};

/**
 * 生成一个用户配置
 * @param userId
 * @param configApp
 * @param configType
 * @param configValue
 */
pub.saveUserConfig = (userId, configApp, configType, configValue) => {
  return userConfigMapper.create({
    'userId': userId,
    'configApp': configApp,
    'configType': configType,
    'configValue': configValue
  });
};

/**
 * 更新配置值
 * @param id
 * @param configValue
 */
pub.updateUserConfigValue = (item) => {
  return userConfigMapper.update(item);
};

module.exports = pub;
