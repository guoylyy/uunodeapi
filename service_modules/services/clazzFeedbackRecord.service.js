'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const winston = require('winston');
const Promise = require('bluebird');
const moment = require('moment');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const clazzFeedbackRecordMapper = require('../dao/mysql_mapper/clazzFeedbackRecord.mapper');

const pub = {};

/**
 * 新建待支付笃师一对一反馈记录
 *
 * @param clazzId
 * @param userId
 * @param teacherUserId
 * @param bill
 * @returns {*}
 */
pub.createClazzFeedbackRecordCompleteItem = (clazzId, userId, teacherUserId, bill) => {
  if (_.isNil(clazzId) || _.isNil(userId) || _.isNil(teacherUserId) || !_.isPlainObject(bill)) {
    winston.error('新建clazzFeedbackRecord失败，参数错误：clazzId: %s, userId: %s, teacherUserId: %s, bill: %j', clazzId, userId, teacherUserId, bill);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackRecordMapper.create({
    userId: userId,
    clazzId: clazzId,
    teacherUserId: teacherUserId,
    status: enumModel.clazzFeedbackRecordStatusEnum.COMPLETED.key,
    bill: JSON.stringify(bill),
  });
};

/**
 * 更新笃师一对一反馈记录
 *
 * @param clazzFeedbackRecordItem
 * @returns {*}
 */
pub.updateClazzFeedbackRecord = (clazzFeedbackRecordItem) => {
  if (!_.isPlainObject(clazzFeedbackRecordItem) || _.isNil(clazzFeedbackRecordItem.id)) {
    winston.error('更新clazzFeedbackRecord失败， 参数错误：clazzFeedbackRecordItem: %j', clazzFeedbackRecordItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackRecordMapper.update(clazzFeedbackRecordItem);
};

pub.queryClazzTeacherFeedbackStatus = (clazzId, userId, teacherUserId) => {
  if (_.isNil(clazzId) || _.isNil(userId) || _.isNil(teacherUserId)) {
    winston.error('查询学员的笃师反馈状态失败，参数错误：clazzId: %s, userId: %s, teacherUserId: %s', clazzId, userId, teacherUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackRecordMapper.queryAll({
        clazzId: clazzId,
        userId: userId,
        teacherUserId: teacherUserId
      })
      .then((clazzFeedbackRecordList) => {
        debug(clazzFeedbackRecordList);

        const initResult = _.reduce(
            enumModel.clazzFeedbackRecordStatusEnum,
            (countMap, value, key) => {
              countMap[key] = 0;
              return countMap;
            },
            {});

        debug(initResult);

        const feedbackCountResult = _.countBy(clazzFeedbackRecordList, 'status');

        return _.extend(initResult, feedbackCountResult);
      })

};

module.exports = pub;
