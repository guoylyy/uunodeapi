'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const clazzStatMapper = require('../dao/mongodb_mapper/clazzStat.mapper');

const pub = {};

/**
 * 查询班级统计信息
 *
 * @param clazzId
 * @returns {Promise|Promise.<*>}
 */
pub.fetchClazzStatItem = (clazzId) => {
  if (_.isNil(clazzId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(clazzId);

  return clazzStatMapper.fetchByParam({
    clazz: clazzId
  });
};

/**
 * 查询班级统计信息列表
 *
 * @param clazzId
 * @param startDate
 * @param endDate
 * @returns {Promise|Promise.<*>}
 */
pub.fetchClazzStatList = (clazzId, startDate, endDate) => {
  if (_.isNil(clazzId) || !_.isDate(startDate) || !_.isDate(endDate)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzStatMapper.fetchAll({
        clazz: clazzId,
        targetTime: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .then((list) => {
          return _.chain(list)
            .sortBy('updatedAt')
            .map(item => {
              item.targetTime = item.updatedAt;

              return item;
            })
            .value();
      });
};

module.exports = pub;
