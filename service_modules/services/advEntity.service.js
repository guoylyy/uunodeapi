'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const winston = require('winston');
const Promise = require('bluebird');

const advMapper = require('../dao/mysql_mapper/advEntity.mapper');

let pub = {};

/**
 * 根据类型广告
 * @param advType
 * @return {Promise<TResult>|Promise}
 */
pub.queryOpenAdv = (advType) => {
  let queryParams = {
    type: advType,
    isOpen: true
  };
  return advMapper.queryAll(queryParams);
};

/**
 * 获取所有的广告
 * @return {Promise<TResult>|Promise}
 */
pub.queryAllAdv = () => {
  return advMapper.queryAll({});
};

/**
 * 获取一则广告
 */
pub.queryAdvById = (advId) => {
  if (_.isNil(advId)) {
    winston.error("ID 不能为空, adv查询参数错误");
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return advMapper.queryAll({'id': advId});
};

/**
 * 删除一个广告
 */
pub.deleteById = (id) => {
  if (_.isNil(id)) {
    winston.error('参数错误,id不能为空');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return advMapper.destroy(id);
};

/**
 * 更新一个广告
 */
pub.updateAdv = (advItem) => {
  if (!_.isPlainObject(advItem) || _.isNil(advItem.id)) {
    winston.error('更新失败，参数错误！！！ advItem: %j', advItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(advItem);

  return advMapper.update(advItem);
};

/**
 * 新建一个广告
 */
pub.createAdv = (advItem) => {
  if (!_.isPlainObject(advItem) || !_.isNil(advItem.id)) {
    winston.error('新建失败，参数错误！！！ advItem: %j', advItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  debug(advItem);
  return advMapper.create(advItem);
};

module.exports = pub;

