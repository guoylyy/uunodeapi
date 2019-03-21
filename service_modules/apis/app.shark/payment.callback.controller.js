'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('controller');
const winston = require('winston');
const xml2js = require('xml2js');

const enumModel = require('../../services/model/enum');

const wechatPayment = require('../../lib/wechat.payment');
const alipayPayment = require('../../lib/alipay/alipay.payment');
const userService = require('../../services/user.service');
const clazzService = require('../../services/clazz.service');
const userPayService = require('../../services/userPay.service');
const clazzAccountService = require('../../services/clazzAccount.service');

const _paymentHandler = (outTradeNo, generateUpdateUserPayItem, clazzPayEndAspect) => {
  userPayService.queryUserPayByBookingNo(outTradeNo)
      .then((userPayList) => {
        debug(userPayList);
        const userPay = userPayList[0];
        winston.info('[payment_callback_processing] %s | %s', outTradeNo, userPay.status);

        // 仅当 待付款记录存在 且为 待支付状态 才进行后续处理
        if (_.isNil(userPay) && userPay.status !== enumModel.payStatusEnum.PAYING.key) {
          winston.info('[404_userpay] : %s', outTradeNo);
        } else {
          const clazzAccountId = userPay.outBizId,
              outBizType = userPay.outBizType;

          winston.info('[payment_callback_success] %s | %s, %s', outTradeNo, outBizType, clazzAccountId);

          const toUpdateUserPayItem = generateUpdateUserPayItem(userPay);
          debug(toUpdateUserPayItem);

          // 1. 更新用户支付记录
          // 2. 根据账单中的outBizId查询clazzAccount记录
          const promiseList = Promise.all(
              [
                userPayService.updateUserPay(toUpdateUserPayItem),
                clazzAccountService.fetchClazzAccountById(clazzAccountId)
              ])
              .catch(winston.error);

          // 仅当为课程支付的时候才继续处理
          if (outBizType === enumModel.userPayOutbizTypeEnum.CLAZZPAY.key) {
            promiseList.then(
                ([updatedUserPay, clazzAccountItem]) => {
                  debug(updatedUserPay);
                  debug(clazzAccountItem);

                  const userId = clazzAccountItem.userId,
                      clazzId = clazzAccountItem.clazzId,
                      clazzBill = JSON.parse(clazzAccountItem.bill || null);

                  debug(userId);
                  debug(clazzId);
                  debug(clazzBill);

                  return Promise.all([clazzService.fetchClazzById(clazzId), userService.fetchById(userId)])
                      .then(([clazzItem, userItem]) => {
                        debug(clazzItem);
                        debug(userItem);

                        return clazzPayEndAspect(userItem, clazzItem, clazzAccountItem, clazzBill, userPay);
                      });
                })
                .catch(winston.error);
          }
        }
      })
      .catch(winston.error);
};

let pub = {};

/**
 * 用户支付回调处理
 *
 * @param req
 * @param res
 */
pub.wechatPaymentCallbackHandler = (req, res) => {
  const msgXml = req.body.xml;

  debug(msgXml);

  winston.info('收到微信账单支付结果, %j', msgXml);

  const returnCode = msgXml.return_code[0],
      resultCode = msgXml.result_code[0],
      transactionId = msgXml.transaction_id[0],
      outTradeNo = msgXml.out_trade_no[0];

  debug(returnCode);
  debug(resultCode);
  debug(transactionId);
  debug(outTradeNo);

  if (resultCode !== 'SUCCESS') {
    winston.error('[pay_error_happen] : %s', outTradeNo);
  } else {
    let generateUpdateUserPayItem = (userPay) => {
      return {
        id: userPay.id,
        status: enumModel.payStatusEnum.PAY_SUCCESS.key,
        transactionId: transactionId
      };
    };

    const clazzPayEndAspect = wechatPayment.clazzPayEndAspect;

    _paymentHandler(outTradeNo, generateUpdateUserPayItem, clazzPayEndAspect);
  }

  // 直接返回成功
  const builder = new xml2js.Builder();
  const xml = builder.buildObject({ 'xml': { 'return_code': 'SUCCESS' } });

  res.set('Content-Type', 'text/xml');
  return res.send(xml);
};

// 支付宝支付回调
pub.alipayPaymentHandler = (req, res) => {
  const alipayResponse = req.body;

  debug(alipayResponse);
  winston.info('收到支付宝账单支付结果, %j', alipayResponse);
  const { trade_status, out_trade_no, trade_no } = alipayResponse;

  // 支付成功，且验签通过
  if (trade_status === "TRADE_SUCCESS" && alipayPayment.verifyResponseSign(alipayResponse)) {
    // 生成更新的 userpay
    let generateUpdateUserPayItem = (userPay) => {
      return {
        id: userPay.id,
        status: enumModel.payStatusEnum.PAY_SUCCESS.key,
        transactionId: trade_no
      };
    };

    const clazzPayEndAspect = alipayPayment.clazzPayEndAspect;

    _paymentHandler(out_trade_no, generateUpdateUserPayItem, clazzPayEndAspect);
  }

  // 返回 success
  return res.send(alipayPayment.notifySuccess());
};

module.exports = pub;
