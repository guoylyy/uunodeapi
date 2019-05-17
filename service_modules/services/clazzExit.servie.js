'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const clazzExitMapper = require('../dao/mysql_mapper/clazzExit.mapper');

const pub = {};

/**
 * 查询班级的退班记录
 * @param status
 * @param clazzId
 * @param pageNumber
 * @param pageSize
 * @return {*}
 */
pub.queryPagedClazzExitList = (status, clazzId, pageNumber = 1, pageSize = 10) => {
  const queryParam = {};

  if (!_.isNil(enumModel.getEnumByKey(status, enumModel.clazzExitStatusTypeEnum))) {
    queryParam.status = status;
  }

  if (!_.isNil(clazzId)) {
    queryParam.clazzId = clazzId;
  }

  debug(queryParam);

  return clazzExitMapper.queryPagedClazzExits(queryParam, pageNumber, pageSize);
};

/**
 * 新建班级的退班
 * @param userId
 * @param clazzId
 * @param clazzAccountId
 * @param userCoins
 * @param userReason
 * @return {*}
 */
pub.createClazzExit = (userId, clazzId, clazzAccountId, userCoins, userReason = "") => {
  if (!_.isSafeInteger(userId) || _.isEmpty(clazzId) || !_.isSafeInteger(clazzAccountId)
      || !_.isSafeInteger(userCoins) || !_.isString(userReason)
  ) {
    winston.error(
        '新建退班记录失败，参数错误！！！userId: %s, clazzId: %s, clazzAccountId: %s, userCoins: %s, userReason: %s',
        userId,
        clazzId,
        clazzAccountId,
        userCoins,
        userReason
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const clazzExitItem = {
    clazzId: clazzId,
    userId: userId,
    clazzAccountId: clazzAccountId,
    userCoins: userCoins,
    userReason: userReason,
    status: enumModel.clazzExitStatusTypeEnum.WAITING.key,
    applyDate: new Date()
  };

  debug(clazzExitItem);

  return clazzExitMapper.createClazzExit(clazzExitItem);
};

/**
 * 更新班级的退班记录
 * @param clazzExitId
 * @param status
 * @param userCoins
 * @param userCoinId
 * @param remark
 * @return {*}
 */
pub.updateClazzExitById = (clazzExitId, status, userCoins, userCoinId, remark = "") => {
  if (!_.isSafeInteger(clazzExitId) || _.isNil(enumModel.getEnumByKey(status, enumModel.clazzExitStatusTypeEnum))
      || !_.isSafeInteger(userCoins) || !_.isString(remark)
  ) {
    winston.error(
        '根据id更新退班记录失败，参数错误！！！clazzExitId: %s, status: %s, userCoins: %s, userCoinId: %s, remark: %s',
        clazzExitId,
        status,
        userCoins,
        userCoinId,
        remark
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const clazzExitItem = {
    id: clazzExitId,
    status: status,
    realUserCoins: userCoins,
    userCoinId: userCoinId,
    remark: remark
  };

  debug(clazzExitItem);

  return clazzExitMapper.updateClazzExit(clazzExitItem);
};

/**
 * 根据退班单号查询班级退班记录
 * @param clazzExitId
 * @return {*}
 */
pub.fetchClazzExitById = (clazzExitId) => {
  if (_.isNil(clazzExitId)) {
    winston.error('根据id获取退班记录，参数错误！！！ clazzExitId: %s', clazzExitId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzExitMapper.fetchClazzExitByParam({id: clazzExitId});
};

/**
 * 获取用户有效的退班记录
 */
pub.fetchAvailableExitByUserId = (clazzId, userId) => {
  if (_.isNil(clazzId) || _.isNil((userId))) {
    winston.error('根据id获取退班记录，参数错误！！！');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return clazzExitMapper.fetchClazzExitByParam({
    'userId': userId, 'clazzId': clazzId,
    'status': {operator: '!=', value: enumModel.clazzExitStatusTypeEnum.REJECTED.key}})
}

module.exports = pub;
