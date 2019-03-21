'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const userPayMapper = require('../dao/mysql_mapper/userPay.mapper');

let pub = {};

/**
 * 为用户生成一条付款记录
 *
 * @param user
 * @param payway
 * @param payData
 * @param outBizId
 * @param outBizType
 * @param bill
 * @returns {*}
 */
pub.generateUserPay = (user, payway, payData, outBizId, outBizType, bill) => {
  debug(user, payway, payData, outBizId, outBizType);

  if (!_.isPlainObject(user) || _.isNil(enumModel.getEnumByKey(payway, enumModel.payWayEnum)) || !_.isPlainObject(payData) || _.isNil(outBizId) || _.isNil(outBizType)) {
    winston.error('生成用户账单失败，参数错误！！！');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const userPay = {
    userId: user.id,
    payway: payway,
    status: enumModel.payStatusEnum.PAYING.key,
    payTime: new Date(),
    prepayId: payData.payData.prepay_id,
    payInfo: JSON.stringify(payData),
    bookingNo: payData.signData.bookingNo,
    outBizId: _.toString(outBizId),
    outBizType: outBizType,
    bill: JSON.stringify(bill)
  };

  debug(userPay);

  return userPayMapper.create(userPay);
};

/**
 * 使用bookingNo查询用户账单记录
 * @param bookingNo
 * @returns {Promise|Promise.<*>}
 */
pub.queryUserPayByBookingNo = (bookingNo) => {
  if (_.isNil(bookingNo)) {
    winston.error('查询用户账单失败，参数错误！！！bookingNo: %s', bookingNo);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userPayMapper.queryUserPays({ bookingNo: bookingNo });
};

/**
 * 更新用户支付记录
 *
 * @param userPay
 * @returns {*}
 */
pub.updateUserPay = (userPay) => {
  if (!_.isPlainObject(userPay) || _.isNil(userPay.id)) {
    winston.error('更新用户账单失败！！！参数错误 userPay: %j', userPay);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userPayMapper.update(userPay);
};

/**
 * 根据id获取用户支付记录
 *
 * @param userPayId
 * @returns {Promise|Promise.<*>}
 */
pub.fetchUserPayById = (userPayId) => {
  if (_.isNil(userPayId)) {
    winston.error('根据id获取用户支付记录失败，参数错误！！！userPayId: %s', userPayId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userPayMapper.fetchByParam({ id: userPayId });
};

/**
 * 查询用户付款记录
 *
 * @param userId
 * @param status
 * @returns {Promise|Promise.<*>}
 */
pub.queryUserPayList = (userId, status) => {
  if (!_.isSafeInteger(userId)) {
    winston.error('根据用户id获取用户付款记录失败，参数错误！！！userId: %s, status: %s', userId, status);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = { userId: userId };

  // 处理状态查询参数
  if (!_.isNil(status)) {
    if (_.isNil(enumModel.getEnumByKey(status, enumModel.payStatusEnum))) {
      return Promise.reject(commonError.PARAMETER_ERROR());
    }

    queryParam.status = status;
  } else {
    // 默认只查询 PAY_SUCCESS 及 PAY_BACK_SUCCESS 的付款记录
    queryParam.status = [enumModel.payStatusEnum.PAY_SUCCESS.key, enumModel.payStatusEnum.PAY_BACK_SUCCESS.key];
  }

  return userPayMapper.queryUserPays(queryParam);
};

/**
 * 根据outBiz类型查询用户支付记录
 *
 * @param outBizType
 * @param outBizIdList
 * @returns {Promise|Promise.<*>}
 */
pub.queryUserPayListByOutBiz = (outBizType, outBizIdList) => {
  if (!_.isString(outBizType) || !_.isArray(outBizIdList)) {
    winston.error('根据outBiz查询用户付款记录列表失败，参数错误！！！outBizType: %s, outBizIdList: %j', outBizType, outBizIdList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userPayMapper.queryUserPays({
    outBizType: outBizType,
    outBizId: outBizIdList,
    status: [enumModel.payStatusEnum.PAY_SUCCESS.key, enumModel.payStatusEnum.PAY_BACK_SUCCESS.key]
  });
};

module.exports = pub;
