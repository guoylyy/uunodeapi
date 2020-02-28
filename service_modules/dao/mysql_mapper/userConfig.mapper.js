'use strict';

/**
 * UserConfig 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const bookshelf = require('../mysql.connection');
const queryUtil = require('../util/queryUtil');
const userConfigSchema = require('./schema/userConfig.schema');

// 常量： 安全查询参数；用于限制查询时的参列表
const QUERY_SAFE_PARAMS = ['id', 'name', 'userId', 'isValid', 'configApp', 'configType'];

const defaultSelectColumns = ['id',  'configApp', 'userId', 'configType', 'configValue', 'createdAt', 'updatedAt'];

let pub = {};

/**
 * 查询用户配置列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAll = (queryParam) => {
  return userConfigSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
      .fetchAll({columns: defaultSelectColumns})
      .then((configList) => {
            debug(configList);
            if (!configList) {
              return [];
            }
            return configList.toJSON();
          }
      )
};

/**
 * 更新用户配置
 */
pub.update = (userConfigItem) => {
  debug(userConfigItem);

  if (!_.isPlainObject(userConfigItem) || _.isNil(userConfigItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  return userConfigSchema.update(userConfigItem);
};

/**
 * 新建用户配置
 */
pub.create = (userConfigItem) =>{
  // 参数检查
  if (!_.isPlainObject(userConfigItem) || !_.isNil(userConfigItem.id)
      || _.isNil(userConfigItem.userId) || _.isNil(userConfigItem.configApp)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug(userConfigItem);

  return userConfigSchema.create(userConfigItem);
};


module.exports = pub;
