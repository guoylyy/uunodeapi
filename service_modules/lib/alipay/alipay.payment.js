"use strict";

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const moment = require('moment');
const uuidV4 = require('uuid/v4');
const crypto = require('crypto');
const request = require('request');
const Promise = require('bluebird');

const systemConfig = require('../../../config/config');
const enumModel = require('../../services/model/enum');

const clazzAccountService = require('../../services/clazzAccount.service');
const userPayService = require('../../services/userPay.service');

const alipayBase = require('./alipay.base');
const paymentBase = require('../payment.base/payment.base')
const paymentEndAspect = require('../payment.base/payment.end.aspect')

const GATEWAY = global.IS_DEVLOPMENT_ENVIRONMENT ? alipayBase.ALIPAY_DEV_GATEWAY : alipayBase.ALIPAY_GATEWAY;
const CLAZZ_PAYING_STATUS_LIST = [enumModel.clazzJoinStatusEnum.PAYING.key, enumModel.clazzJoinStatusEnum.INVITATION.key, enumModel.clazzJoinStatusEnum.CANCELED.key];

const pub = {};

/**
 * App支付请求参数
 *
 * https://docs.open.alipay.com/204/105465/
 *
 * @param subject       商品的标题/交易标题/订单标题/订单关键字等。                        例：大乐透
 * @param tradeNo       商户网站唯一订单号                                             例：70501111111S001111119
 * @param totalAmount   订单总金额，单位为元，精确到小数点后两位，取值范围[0.01,100000000]   例：9.00
 */
const signPayment = (subject, tradeNo, totalAmount) => {
  const appAlipayConfig = _.get(systemConfig, ['APP_SHARK_CONFIG', 'ALIPAY_CONFIG']);

  const publicParams = {
    subject: subject,
    out_trade_no: tradeNo,
    total_amount: totalAmount.toFixed(2),
    product_code: 'QUICK_MSECURITY_PAY'
  };

  const basicParams = {
    app_id: appAlipayConfig.APP_ID,
    method: alipayBase.ALIPAY_METHOD_TYPES.CREATE_APP_ORDER,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
    version: "1.0",
    notify_url: appAlipayConfig.NOTIFY_URL,
    biz_content: JSON.stringify(publicParams)
  };

  debug(basicParams);

  const sign = alipayBase.makeSign(basicParams, appAlipayConfig.PRIVATE_KEY);
  const signStr = alipayBase.makeSignStr(basicParams);

  const data = _.chain(signStr)
      .split("&")
      .map((param) => {
        const [key, value] = param.split("=");

        return `${ key }=${ encodeURIComponent(value) }`
      })
      .join("&")
      .value();

  return _.extend(
      {},
      basicParams,
      publicParams,
      {
        bookingNo: tradeNo,
        sign: `${ data }&sign=${ encodeURIComponent(sign) }`
      }
  );
};

const generateAppPayBill = (clazz, clazzAccount, currentUser, clazzBill) => {
  debug(clazz);
  debug(clazzAccount);
  debug(currentUser);
  debug(clazzBill);

  const paymentSubject = clazz.name,
      bookingNo = `${enumModel.userPayOutbizTypeEnum.CLAZZPAY.key}_${ _.now() }_${ uuidV4().substr(0, 4) }`;

  debug(paymentSubject);
  debug(bookingNo);

  const payResult = paymentBase.initializePayResult();

  return Promise.resolve(signPayment(paymentSubject, bookingNo, clazzBill.money / 100))
      .then((signData) => {
        payResult.success = true;
        payResult.payData = { prepay_id: bookingNo };
        payResult.signData = signData;

        const payway = _.get(clazzBill, ['payway'], enumModel.payWayEnum.alipay.key);

        const generateUserPayPromise = userPayService.generateUserPay(
            currentUser,
            payway,
            payResult,
            clazzAccount.id,
            enumModel.userPayOutbizTypeEnum.CLAZZPAY.key,
            clazzBill
        );

        const updateClazzAccountPromise = clazzAccountService.update({
          id: clazzAccount.id,
          bill: JSON.stringify(clazzBill)
        });

        return Promise.all([generateUserPayPromise, updateClazzAccountPromise])
            .then(([userPay, clazzAccountItem]) => {
              debug(userPay);
              debug(clazzAccountItem);

              return {
                action: enumModel.clazzPaymentResultEnum.TOPAY.key,
                signData: signData
              };
            });
      })
      .catch((error) => {
        winston.error(error);

        payResult.message = '账单构建失败';
        payResult.success = false;

        return payResult;
      });
};

pub.clazzPayEndAspect = paymentEndAspect.clazzPayEndAspect;

/**
 * 验证回调签名
 *
 * @param params
 * @returns {*}
 */
pub.verifyResponseSign = (params) => {
  const appAlipayConfig = _.get(systemConfig, ['APP_SHARK_CONFIG', 'ALIPAY_CONFIG']);

  const response = {
    sign: params.sign,            // 签名
    sign_type: params.sign_type,  // 签名类型
    async_notify_response: params //
  };

  return alipayBase.verifySign(response, appAlipayConfig.PUBLIC_KEY, params, ["sign", "sign_type"]);
};

/**
 * 返回 success
 *
 * @returns {string}
 */
pub.notifySuccess = () => {
  return alipayBase.ALIPAY_NOTIFY_SUCCESS;
};

/**
 * 返回 failure
 *
 * @returns {string}
 */
pub.notifyFailure = () => {
  return alipayBase.ALIPAY_NOTIFY_FAILURE;
};

/**
 * 班级支付预处理方法工厂
 *
 * @param clazzType
 * @returns {*}
 */
pub.appClazzPaymentHandlerFactory = (clazzType) => {
  /**
   * 直接加入班级， 当支付金额为0时调用
   *
   * @param currentUserItem
   * @param currentClazzItem
   * @param clazzAccountItem
   * @param clazzBill
   * @returns {Promise|*|Promise.<TResult>}
   */
  const directlyJoinClazz = (currentUserItem, currentClazzItem, clazzAccountItem, clazzBill) => {
    paymentEndAspect.clazzPayEndAspect(currentUserItem, currentClazzItem, clazzAccountItem, clazzBill, null);

    return clazzAccountService.update({ id: clazzAccountItem.id, bill: JSON.stringify(clazzBill) })
        .then((updatedClazzAccount) => {
          debug(updatedClazzAccount);

          return {
            action: enumModel.clazzPaymentResultEnum.SUCCESS.key,
            // 签名信息为空
            signData: {}
          }
        });
  };

  switch (clazzType) {
    case enumModel.clazzTypeEnum.LONG_TERM.key:
      return (clazzBill, currentClazzItem, currentUserItem, currentClazzAccountItem) => {

        debug(clazzBill);

        const createClazzAccountPromise = _.isNil(currentClazzAccountItem)
            ? clazzAccountService.userJoinClazz(currentUserItem, currentClazzItem)
            : Promise.resolve(currentClazzAccountItem);

        const validBillPromise = paymentBase.isBillValid(clazzBill, currentUserItem, currentClazzItem);

        return Promise.all([createClazzAccountPromise, validBillPromise])
            .then(([clazzAccountItem, checkResult]) => {
              debug(clazzAccountItem);
              debug(checkResult);

              /*
               确保支付金额为整数
               待支付金额为0的情况
               */
              if (_.toInteger(clazzBill.money) === 0) {
                return directlyJoinClazz(currentUserItem, currentClazzItem, clazzAccountItem, clazzBill);
              }

              // 支付账单
              return generateAppPayBill(currentClazzItem, clazzAccountItem, currentUserItem, clazzBill);
            })
      };
    case enumModel.clazzTypeEnum.SEMESTER.key:
    case enumModel.clazzTypeEnum.LTS.key:
    case enumModel.clazzTypeEnum.PROMOTION.key:
      return (clazzBill, currentClazzItem, currentUserItem, currentClazzAccountItem) => {
        debug(clazzBill);
        debug(currentClazzItem);
        debug(currentUserItem);
        debug(currentClazzAccountItem);

        // 验证课程是否已经开放报名
        if (currentClazzItem.status !== enumModel.clazzStatusEnum.OPEN.key) {
          return Promise.reject(commonError.PARAMETER_ERROR('课程未开放'));
        }

        const createClazzAccountPromise = _.isNil(currentClazzAccountItem)
            ? clazzAccountService.userJoinClazz(currentUserItem, currentClazzItem)
            : Promise.resolve(currentClazzAccountItem);

        const validBillPromise = paymentBase.isBillValid(clazzBill, currentUserItem, currentClazzItem);

        return Promise.all([createClazzAccountPromise, validBillPromise])
            .then(([clazzAccountItem, checkResult]) => {
              debug(clazzAccountItem);
              debug(checkResult);

              // 是否已经加入班级
              if (!_.includes(CLAZZ_PAYING_STATUS_LIST, clazzAccountItem.status)) {
                return {
                  action: enumModel.clazzPaymentResultEnum.ALREADY_JOIN.key,
                  // 签名信息为空
                  signData: {}
                };
              }

              /*
               确保支付金额为整数
               待支付金额为0的情况
              */
              if (_.toInteger(clazzBill.money) === 0) {
                return directlyJoinClazz(currentUserItem, currentClazzItem, clazzAccountItem, clazzBill);
              }

              // 支付账单
              return generateAppPayBill(currentClazzItem, clazzAccountItem, currentUserItem, clazzBill);
            });
      };
    default:
      return Promise.reject(commonError.PARAMETER_ERROR('未知班级类型，参数错误'));
  }
};

module.exports = pub;
