'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const userLikeMapper = require('../dao/mysql_mapper/userLike.mapper');

let pub = {};

/**
 * 获取用户在一个业务下的笔芯统计
 * @param userId
 * @param appType
 */
pub.fetchUserLikeStaticitcs = (userId, appType) => {
  if (_.isNil(userId) || _.isNil(appType)) {
    winston.error('获取积分统计信息失败！！！');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return userLikeMapper.sumUserLike(userId, appType);
};

/**
 * 分页获取用户笔芯记录
 * @param userId
 * @param pageNumber
 * @param pageSize
 * @param appType
 */
pub.fetchUserLikesByPageList = (userId, appType, pageNumber=1, pageSize=10) => {
  if (_.isNil(userId) || _.isNil(appType)) {
    winston.error('获取积分统计信息失败！！！');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  let params = {
    'userId':userId,
    'appType': appType
  };
  return userLikeMapper.queryPageUserLikes(params, pageNumber, pageSize);
};


/**
 * 获取用户笔芯相关记录列表
 * @param userId
 * @param appType
 */
pub.fetchUserLikeFromTasks = (userId, taskKeys, appType) => {
  if (!_.isNil(userId) && !_.isNil(appType) && !_.isArray(taskKeys)) {
    winston.error('获取积分信息失败！！！');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  let params = {
    'userId': userId,
    'appType': appType,
    'likeType': {operator: 'in', value: taskKeys}
  };
  return userLikeMapper.fetchByParam(params);
};

module.exports = pub;
