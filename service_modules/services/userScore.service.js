'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const userScoreUtil = require('./util/userScore.util');

const userScoreRecordMapper = require('../dao/mysql_mapper/userScoreRecord.mapper');

const pub = {};

/**
 * 新建用户积分记录
 *
 * @param userScoreItem
 * @returns {*}
 */
pub.addUserScoreRecord = (userScoreItem) => {
  if (!_.isPlainObject(userScoreItem) || !_.isNil(userScoreItem.id) ||
      _.isNil(enumModel.getEnumByKey(userScoreItem.type, enumModel.userScoreTypeEnum))) {
    winston.error('新建用户积分记录失败，参数错误！scoreRecordItem: %j', userScoreItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(userScoreItem);

  return userScoreRecordMapper.create(userScoreItem);
};

/**
 * 更新用户积分记录
 *
 * @param id
 * @param score
 * @param remark
 * @returns {*}
 */
pub.updateUserScoreRecord = (id, score, remark) => {
  if (_.isNil(id) || !_.isSafeInteger(score) || score < 0 || !_.isString(remark)) {
    winston.error('更新用户积分 %s 记录失败，参数错误！score: %s, remark: %s', id, score, remark);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userScoreRecordMapper.update({
    id: id,
    scoreChange: score,
    remark: remark
  });
};

/**
 * 根据id 获取积分详情
 *
 * @param id
 * @returns {*}
 */
pub.fetchScoreRecordById = (id) => {
  if (_.isNil(id)) {
    winston.error('获取用户积分 %s 记录失败，参数错误！', id);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userScoreRecordMapper.fetchOneByParam({ id: id });
};

/**
 * 根据id 列表获取积分列表
 *
 * @param idList
 * @returns {*}
 */
pub.fetchAllScoreRecordsByIdList = (idList) => {
  if (!_.isArray(idList)) {
    winston.error('根据id列表获取积分记录失败，参数错误！idList: %j', idList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  if (_.isEmpty(idList)) {
    return Promise.resolve([]);
  }

  return userScoreRecordMapper.queryAll({ id: idList });
};

/**
 * 计算用户积分
 *
 * @param userId
 * @param clazzId
 * @param type
 * @param targetId
 * @returns {Promise.<*>}
 */
pub.calculateUserScore = (userId, clazzId, type, targetId) => {
  if (_.isNil(userId) || _.isNil(clazzId) ||
      _.isNil(enumModel.getEnumByKey(type, enumModel.userScoreTypeEnum)) || _.isNil(targetId)) {
    winston.error('计算用户 %s 积分失败，参数错误！clazzId: %s, type: %s, targetId: %s', userId, clazzId, type, targetId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userScoreRecordMapper.queryAll({
        userId: userId,
        clazzId: clazzId,
        type: type,
        targetId: targetId
      })
      .then((userScoreList) => {
        const userScoreCalculator = userScoreUtil.userScoreCalculatorFactory(type);

        return userScoreCalculator(userScoreList);
      });
};

/**
 * 计算用户班级积分总和
 *
 * @param userId
 * @param clazzId
 * @returns {Promise.<*>}
 */
pub.sumClazzScore = (userId, clazzId) => {
  if (_.isNil(userId) || _.isNil(clazzId)) {
    winston.error('计算用户 %s 班级积分总和失败，参数错误！clazzId: %s', userId, clazzId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userScoreRecordMapper.queryAll({
        userId: userId,
        clazzId: clazzId
      })
      .then((userScoreList) => {
        return _.chain(userScoreList)
            .groupBy('type')
            .map((scoreList, type) => {
              const userScoreCalculator = userScoreUtil.userScoreCalculatorFactory(type);

              return userScoreCalculator(userScoreList);
            })
            .sum()
            .value();
      });
};

module.exports = pub;
