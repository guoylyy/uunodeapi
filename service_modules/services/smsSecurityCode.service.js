'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');
const moment = require('moment');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const commonUtil = require('./util/common.util');

const smsSecurityCodeMapper = require('../dao/mysql_mapper/smsSecurityCode.mapper');

const smsComponent = require('./component/sms.component');

/**
 * 给指定的手机号发送验证码
 *
 * @param codeType
 * @param phoneNumber
 * @param limit
 * @param userId
 * @returns {Promise.<TResult>}
 */
const sendCodeToPhonenumber = (codeType, phoneNumber, limit = 5, userId) => {
  const todayBeginDate = moment().startOf('day').toDate(),
      todayEndDate = moment().endOf('day').toDate();

  const fetchLatestPromise = smsSecurityCodeMapper.fetchByParam({
    phoneNumber: phoneNumber,
    codeType: codeType
  });

  const countTodaySmsPromise = smsSecurityCodeMapper.countAll({
    phoneNumber: phoneNumber,
    createdAt: {
      operator: 'and',
      value: [{ operator: '<=', value: todayEndDate }, { operator: '>=', value: todayBeginDate }]
    },
    codeType: codeType
  });

  return Promise.all([fetchLatestPromise, countTodaySmsPromise])
      .then(([latestSms, todaySmsCount]) => {
        debug(latestSms);
        debug(todaySmsCount);

        if (!_.isNil(latestSms) && moment(latestSms.createdAt).add(30, 'seconds').isAfter(new Date())) {
          winston.error(`手机号 ${ phoneNumber } 操作过于频繁`);
          return Promise.reject(commonError.PARAMETER_ERROR('操作过于频繁，请稍后再试'));
        }

        if (todaySmsCount >= limit) {
          winston.error(`手机号 ${ phoneNumber } 今日的短信条数已用光`);
          return Promise.reject(commonError.PARAMETER_ERROR('今日的短信条数已用光'));
        }

        const securityCode = commonUtil.generateRandomString(6, "0123456789");
        debug(securityCode);

        return smsComponent.sendCodeToPhonenumber(securityCode, phoneNumber)
            .then((response) => {
              debug(response);

              if (response.code !== 0) {
                return Promise.reject(commonError.BIZ_FAIL_ERROR(response.msg));
              }

              return smsSecurityCodeMapper.create({
                code: securityCode,
                phoneNumber: phoneNumber,
                codeType: codeType,
                expireAt: moment().add(10, 'minutes').toDate(),
                userId: userId
              });
            });
      });
};

const pub = {};

/**
 * 发送注册验证码到手机
 *
 * @param phoneNumber
 * @param limit
 * @returns {Promise.<TResult>}
 */
pub.sendRegisterCode = (phoneNumber, limit = 5) => {
  debug(phoneNumber);

  const codeType = enumModel.securityCodeTypeEnum.REGISTER.key;

  return sendCodeToPhonenumber(codeType, phoneNumber, limit);
};

/**
 * 发送重置密码验证码
 *
 * @param userId
 * @param phoneNumber
 * @param limit
 * @returns {Promise.<TResult>}
 */
pub.sendResetPasswordCode = (userId, phoneNumber, limit = 5) => {
  debug(userId);
  debug(phoneNumber);

  const codeType = enumModel.securityCodeTypeEnum.RESET_PASSWORD.key;

  return sendCodeToPhonenumber(codeType, phoneNumber, limit, userId);
};

/**
 * 获取手机号的最新验证码
 *
 * @param codeType
 * @param phoneNumber
 * @returns {*}
 */
pub.fetchLatestSecurityCode = (codeType, phoneNumber) => {
  if (_.isNil(enumModel.getEnumByKey(codeType, enumModel.securityCodeTypeEnum))) {
    winston.error(`获取手机号 ${ phoneNumber } 短信记录，参数错误：codeType: ${ codeType }`);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return smsSecurityCodeMapper.fetchByParam({
    phoneNumber: phoneNumber,
    codeType: codeType
  });
};

/**
 * 过期验证码
 *
 * @param codeId
 * @returns {*}
 */
pub.expireSecurityCode = (codeId) => {
  return smsSecurityCodeMapper.update({
    id: codeId,
    expireAt: new Date()
  });
};

module.exports = pub;
