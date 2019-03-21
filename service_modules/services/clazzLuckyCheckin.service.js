'use strict';

const _ = require('lodash');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const userService = require('./user.service');
const checkinService = require('./checkin.service');

const clazzUtil = require('./util/clazz.util');
const commonError = require('./model/common.error');

const clazzLuckyCheckinMapper = require('../dao/mongodb_mapper/clazzLuckyCheckin.mapper');

const pub = {};

/**
 * 根据日期查询班级抽打卡信息
 *
 * @param clazzId
 * @param date
 * @returns {*}
 */
pub.queryClazzLuckyCheckinByDate = (clazzId, date) => {
  debug(clazzId);
  debug(date);

  if (_.isNil(clazzId) || !_.isDate(date)) {
    winston.error('查询班级抽打卡记录失败，参数错误：clazzId: %s, date: %j', clazzId, date);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = {
    clazz: clazzId,
    date: {
      '$gte': moment(date).startOf('day').toDate(),
      '$lte': moment(date).endOf('day').toDate()
    }
  };

  debug(queryParam);

  return clazzLuckyCheckinMapper.fetchByPrams(queryParam);
};

/**
 * 抽打卡
 *
 * @param clazzId
 * @param date
 * @param luckyNumber
 * @returns {Promise.<*>}
 */
pub.createClazzLuckyCheckin = (clazzId, date, luckyNumber) => {
  debug(clazzId);
  debug(date);
  debug(luckyNumber);

  if (_.isNil(clazzId) || !_.isDate(date) || !_.isSafeInteger(luckyNumber) || luckyNumber <= 0) {
    winston.error('抽取班级打卡记录失败，参数错误：clazzId: %s, date: %j, luckyNumber: %s', clazzId, date, luckyNumber);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const startDate = moment(date).startOf('day').toDate(),
      endDate = moment(date).endOf('day').toDate();

  return checkinService.queryCheckinList(null, clazzId, startDate, endDate)
      .then((checkinList) => {
        const checkinSize = _.size(checkinList);
        debug(checkinSize);

        if (checkinSize < luckyNumber) {
          winston.error(
              '抽取班级打卡记录失败，当天打卡人数不足！ 打卡数： %d，参数：clazzId: %s, date: %j, luckyNumbers: %s',
              checkinSize,
              clazzId,
              date,
              luckyNumber
          );

          return Promise.reject(commonError.BIZ_FAIL_ERROR('当天打卡人数不足！'));
        }

        const checkinIdList = _.chain(checkinList)
            .sampleSize(luckyNumber)
            .map('id')
            .value();

        return clazzLuckyCheckinMapper.create({
          clazz: clazzId,
          date: date,
          luckyNumber: luckyNumber,
          checkins: checkinIdList
        });
      });
};

/**
 * 根据抽打卡item获取对应的打卡列表
 *
 * @param clazzLuckyCheckinItem
 */
pub.fetchCheckinListByLuckyCheckinItem = (clazzLuckyCheckinItem) => {
  const checkinIds = _.get(clazzLuckyCheckinItem, 'checkins', []),
      startDate = moment(clazzLuckyCheckinItem.date).startOf('day').toDate(),
      endDate = moment(clazzLuckyCheckinItem.date).endOf('day').toDate();

  debug(checkinIds);

  return checkinService.queryCheckinList(null, clazzLuckyCheckinItem.clazz, startDate, endDate, checkinIds)
      .then((checkinList) => {
        const userIds = _.map(checkinList, 'userId');

        debug(userIds);

        // 获取打卡学员列表
        return userService.queryUser(null, userIds)
            .then((userList) => {
              // 匹配用户到打卡项目中
              clazzUtil.fillCheckinWithUser(checkinList, userList);

              return checkinList;
            });
      });
};

/**
 * 根据id获取抽打卡详情
 *
 * @param clazzLuckyCheckinId
 * @returns {Promise.<TResult>}
 */
pub.fetchLuckyCheckinById = (clazzLuckyCheckinId) => {
  debug(clazzLuckyCheckinId);

  return clazzLuckyCheckinMapper.fetchById(clazzLuckyCheckinId);
};

/**
 * 根据抽打卡id获取打卡列表
 *
 * @param clazzLuckyCheckinId
 * @returns {Promise.<TResult>}
 */
pub.fetchCheckinListById = (clazzLuckyCheckinId) => {
  debug(clazzLuckyCheckinId);

  return pub.fetchLuckyCheckinById(clazzLuckyCheckinId)
      .then((clazzLuckyCheckinItem) => {
        debug(clazzLuckyCheckinItem);

        if (_.isNil(clazzLuckyCheckinItem)) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        return pub.fetchCheckinListByLuckyCheckinItem(clazzLuckyCheckinItem);
      });
};

module.exports = pub;
