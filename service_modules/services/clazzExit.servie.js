'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const clazzExitMapper = require('../dao/mysql_mapper/clazzExit.mapper');

const pub = {};

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

pub.fetchClazzExitById = (clazzExitId) => {
  if (_.isNil(clazzExitId)) {
    winston.error('根据id获取退班记录，参数错误！！！ clazzExitId: %s', clazzExitId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzExitMapper.fetchClazzExitByParam({ id: clazzExitId });
};

module.exports = pub;
