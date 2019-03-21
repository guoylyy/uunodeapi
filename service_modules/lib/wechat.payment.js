'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const uuidV4 = require('uuid/v4');
const crypto = require('crypto');
const request = require('request');
const Promise = require('bluebird');

const systemConfig = require('../../config/config');
const enumModel = require('../services/model/enum');
const commonError = require('../services/model/common.error');

const wechatBase = require('./wechat.base');
const paymentBase = require('./payment.base/payment.base')
const paymentEndAspect = require('./payment.base/payment.end.aspect')

const clazzAccountService = require('../services/clazzAccount.service');
const userPayService = require('../services/userPay.service');

// todo 移到系统配置
const PAYMENT_IP = '10.60.43.10';
const PAY_SIGN_KEY = '1QAZ2wsxqwertyui123456781QAZ2wsx';
const PAY_ATTACH = 'fdasfa';
const UNIFIED_ORDER_URL = "https://api.mch.weixin.qq.com/pay/unifiedorder";
const { payWayEnum } = enumModel;

const paysignjsapi = (appid, attach, body, mch_id, nonce_str, notify_url, openid, out_trade_no, spbill_create_ip, total_fee, trade_type) => {
  const toRawObject = {
    appid: appid,
    attach: attach,
    body: body,
    mch_id: mch_id,
    nonce_str: nonce_str,
    notify_url: notify_url,
    openid: openid,
    out_trade_no: out_trade_no,
    spbill_create_ip: spbill_create_ip,
    total_fee: total_fee,
    trade_type: trade_type
  };
  const string = wechatBase.rawString(toRawObject) + '&key=' + PAY_SIGN_KEY;

  debug(string);

  return crypto.createHash('md5').update(string, 'utf8').digest('hex');
};

const paysignjs = (appid, nonceStr, packages, signType, timeStamp) => {
  const toRawObject = {
    appId: appid,
    nonceStr: nonceStr,
    package: packages,
    signType: signType,
    timeStamp: timeStamp
  };

  const string = wechatBase.rawString(toRawObject) + '&key=' + PAY_SIGN_KEY;

  debug(string);

  return crypto.createHash('md5').update(string, 'utf8').digest('hex');
};

const paysignAppApi =  (appid, mch_id, secretKey, attach, body, nonce_str, notify_url, out_trade_no, spbill_create_ip, total_fee, trade_type) => {
  const toRawObject = {
    appid: appid,
    attach: attach,
    body: body,
    mch_id: mch_id,
    nonce_str: nonce_str,
    notify_url: notify_url,
    out_trade_no: out_trade_no,
    spbill_create_ip: spbill_create_ip,
    total_fee: total_fee,
    trade_type: trade_type
  };
  const string = wechatBase.rawString(toRawObject) + '&key=' + secretKey;

  debug(string);

  return crypto.createHash('md5').update(string, 'utf8').digest('hex');
};

const paysignApp = (appId, partnerId, secretKey, prepayId, packages, nonceStr, timeStamp) => {
  const toRawObject = {
    appid: appId,
    partnerid: partnerId,
    prepayid: prepayId,
    package: packages,
    noncestr: nonceStr,
    timestamp: timeStamp
  };

  debug(toRawObject);

  const toSignStr = wechatBase.rawString(toRawObject) + '&key=' + secretKey;

  debug(toSignStr);

  return crypto.createHash('md5').update(toSignStr, 'utf8').digest('hex');
};

const compiledPaymentBodyTemplate = _.template("<xml>\
  <appid>${ appid }</appid>\
  <attach>${ attach }</attach>\
  <body>${ body }</body>\
  <mch_id>${ mchId }</mch_id>\
  <nonce_str>${ nonceStr }</nonce_str>\
  <notify_url>${ notifyUrl }</notify_url>\
  <openid>${ openId }</openid>\
  <out_trade_no>${ outTradeNo }</out_trade_no>\
  <spbill_create_ip>${ spbillCreateIp }</spbill_create_ip>\
  <total_fee>${ totalFee }</total_fee>\
  <trade_type>${ tradeType }</trade_type>\
  <sign>${ sign }</sign>\
  </xml>");

const compiledAppPaymentBodyTemplate = _.template("<xml>\
  <appid>${ appid }</appid>\
  <attach>${ attach }</attach>\
  <body>${ body }</body>\
  <mch_id>${ mchId }</mch_id>\
  <nonce_str>${ nonceStr }</nonce_str>\
  <notify_url>${ notifyUrl }</notify_url>\
  <out_trade_no>${ outTradeNo }</out_trade_no>\
  <spbill_create_ip>${ spbillCreateIp }</spbill_create_ip>\
  <total_fee>${ totalFee }</total_fee>\
  <trade_type>${ tradeType }</trade_type>\
  <sign>${ sign }</sign>\
  </xml>");

const getRequestUnifiedOrderPromise = (appid, mchId, notifyUrl) => (totalFee, bookingNo, body, openid, timeStamp, ip) => {
  debug(totalFee, bookingNo, body, openid, timeStamp, ip);
  const nonceStr = 'nonce_' + timeStamp + "_" + uuidV4().substr(0, 4);

  const tradeType = 'JSAPI';
  const formData = compiledPaymentBodyTemplate({
    appid: appid,               // appid
    attach: PAY_ATTACH,         // 附加数据
    body: body,                 // 商品描述
    mchId: mchId,               // 商户号
    nonceStr: nonceStr,         // 随机字符串，不长于32位
    notifyUrl: notifyUrl,       // 通知地址
    openId: openid,             // 用户标识
    outTradeNo: bookingNo,      // 商户订单号
    spbillCreateIp: ip,         // 终端IP
    totalFee: totalFee,         // 标价金额
    tradeType: tradeType,
    sign: paysignjsapi(appid, PAY_ATTACH, body, mchId, nonceStr, notifyUrl, openid, bookingNo, ip, totalFee, tradeType) // 签名
  });
  debug(formData);

  const cbData = {
    success: false,
    payData: null,
    signData: null
  };

  return new Promise((resolve, reject) => {
    request(
        {
          url: UNIFIED_ORDER_URL,
          method: 'POST',
          body: formData
        },
        (err, response, body) => {
          debug(err);
          debug(body);
          if (!err && response.statusCode == 200) {
            const utf8Body = body.toString("utf-8");

            const returnCode = wechatBase.getXMLNodeValue('return_code', utf8Body);
            debug(returnCode);

            // 验证返回结果是否错误
            if (returnCode === '<![CDATA[FAIL]]>') {
              // 获取错误消息
              const originMessage = wechatBase.getXMLNodeValue('return_msg', utf8Body);
              const errorMessage = originMessage.substring(9, originMessage.length - 3);

              debug(errorMessage);

              return reject(errorMessage);
            }

            const prepayId = wechatBase.getXMLNodeValue('prepay_id', utf8Body);
            const tmp = _.split(prepayId, '[');
            const tmp1 = _.split(tmp[2], ']');
            debug(prepayId, tmp, tmp1);

            const packages = 'prepay_id=' + tmp1[0];
            //签名
            const _paySignjs = paysignjs(appid, nonceStr, packages, 'MD5', timeStamp);
            winston.info('[payment_generate_success] : %j', _paySignjs);

            debug(_paySignjs);

            cbData.success = true;
            cbData.payData = { prepay_id: tmp1[0], _paySignjs: _paySignjs };
            cbData.signData = {
              appid: appid,
              timeStamp: timeStamp,
              nonceStr: nonceStr,
              package: packages,
              signType: 'MD5',
              paySign: _paySignjs,
              bookingNo: bookingNo,
              totalFee: totalFee,
            };
          } else {
            winston.error('[payment_fail], error: %j', err);
          }

          debug(cbData);
          return resolve(cbData);
        });
  })
};

const requestAppUnifiedOrderPromise = (appid, mchId, secretKey, notifyUrl, totalFee, bookingNo, body, timeStamp, ip) => {
  debug(appid, mchId, notifyUrl, totalFee, bookingNo, body, timeStamp, ip);
  const nonceStr = 'nonce_' + timeStamp + "_" + uuidV4().substr(0, 4);

  const tradeType = 'APP';
  const formData = compiledAppPaymentBodyTemplate({
    appid: appid,               // appid
    attach: PAY_ATTACH,         // 附加数据
    body: body,                 // 商品描述
    mchId: mchId,               // 商户号
    nonceStr: nonceStr,         // 随机字符串，不长于32位
    notifyUrl: notifyUrl,       // 通知地址
    outTradeNo: bookingNo,      // 商户订单号
    spbillCreateIp: ip,         // 终端IP
    totalFee: totalFee,         // 标价金额
    tradeType: tradeType,
    sign: paysignAppApi(appid, mchId, secretKey, PAY_ATTACH, body, nonceStr, notifyUrl, bookingNo, ip, totalFee, tradeType) // 签名
  });
  debug(formData);

  const cbData = {
    success: false,
    payData: null,
    signData: null
  };

  return new Promise((resolve, reject) => {
    request(
        {
          url: UNIFIED_ORDER_URL,
          method: 'POST',
          body: formData
        },
        (err, response, body) => {
          debug(err);
          debug(body);
          if (!err && response.statusCode == 200) {
            const utf8Body = body.toString("utf-8");

            const returnCode = wechatBase.getXMLNodeValue('return_code', utf8Body);
            debug(returnCode);

            // 验证返回结果是否错误
            if (returnCode === '<![CDATA[FAIL]]>') {
              // 获取错误消息
              const originMessage = wechatBase.getXMLNodeValue('return_msg', utf8Body);
              const errorMessage = originMessage.substring(9, originMessage.length - 3);

              debug(errorMessage);

              return reject(errorMessage);
            }

            const prepayIdNode = wechatBase.getXMLNodeValue('prepay_id', utf8Body);
            const tmp = _.split(prepayIdNode, '[');
            const tmp1 = _.split(tmp[2], ']');
            debug(prepayIdNode, tmp, tmp1);
            const prepayId = tmp1[0];

            const packages = 'Sign=WXPay';
            //签名
            const _paySignjs = paysignApp(appid, mchId, secretKey, prepayId, packages, nonceStr, timeStamp);
            winston.info('[app_payment_generate_success] : %j', _paySignjs);

            debug(_paySignjs);

            cbData.success = true;
            cbData.payData = { prepay_id: prepayId, _paySignjs: _paySignjs };
            cbData.signData = {
              partnerId: mchId,
              prepayId: prepayId,
              package: packages,
              nonceStr: nonceStr,
              timeStamp: timeStamp,
              sign: _paySignjs,
              bookingNo: bookingNo,
              totalFee: totalFee,
            };
          } else {
            winston.error('[payment_fail], error: %j', err);
          }

          debug(cbData);
          return resolve(cbData);
        });
  })
};

/**
 * 为用户生成课程支付账单
 *
 * @param clazz
 * @param clazzAccount
 * @param userItem
 * @param bill
 * @param _ip
 * @returns {Promise.<T>|Promise}
 */
const payForClazz = (clazz, clazzAccount, userItem, bill, _ip) => {
  // 生成一笔订单
  const _body = clazz.name,
      _timeStamp = _.now(),
      bookingNo = `${enumModel.userPayOutbizTypeEnum.CLAZZPAY.key}_${ _timeStamp }_${ uuidV4().substr(0, 4) }`;

  debug(_body);
  debug(bookingNo);

  _ip = PAYMENT_IP; //目前这里是写死的

  const payResult = paymentBase.initializePayResult();

  /**
   * 获取微信APP (服务号) 统一下单函数
   */
  const requestWechatAppUnifiedOrderPromise = getRequestUnifiedOrderPromise(
      systemConfig.WECHAT_APP_CONFIG.APP_ID,
      systemConfig.WECHAT_APP_CONFIG.PAY_MCH_ID,
      `${ systemConfig.BASE_URL }/api/wechat/pay`
  );

  return requestWechatAppUnifiedOrderPromise(bill.money, bookingNo, _body, userItem.openId, _timeStamp, _ip)
      .catch((error) => {
        winston.error(error);

        payResult.message = '账单构建失败';
        payResult.success = false;

        return payResult;
      })
};

/**
 * 生成微信小程序笃师一对一账单
 *
 * @param clazzName
 * @param bill
 * @param openId
 * @returns {Promise|Promise.<T>}
 */
const payForWeappOne = (clazzName, bill, openId) => {
  // 生成一笔订单
  const description = `${ clazzName }笃师一对一`,
      timeStamp = _.now(),
      bookingNo = `${enumModel.userPayOutbizTypeEnum.WEAPPCLAZZONE.key}_${ timeStamp }_${ uuidV4().substr(0, 4) }`;

  // 获取小程序笃师一对一统一下单函数
  const requestWeappUnifiedOrderPromise = getRequestUnifiedOrderPromise(
      systemConfig.WEAPP_ONE_CONFIG.APP_ID,
      systemConfig.WEAPP_ONE_CONFIG.PAY_MCH_ID,
      `${ systemConfig.WEAPP_ONE_BASE_URL }/api/wechat/pay`
  );

  const payResult = paymentBase.initializePayResult();

  return requestWeappUnifiedOrderPromise(bill.money, bookingNo, description, openId, timeStamp, PAYMENT_IP)
      .catch((error) => {
        winston.error(error);

        payResult.message = '账单构建失败';
        payResult.success = false;

        return payResult;
      });
};

/**
 * 为用户生成课程支付账单
 *
 * @param clazz
 * @param clazzAccount
 * @param userItem
 * @param bill
 * @param _ip
 * @returns {Promise.<T>|Promise}
 */
const payForAppClazz = (clazz, clazzAccount, userItem, bill, _ip) => {
  // 生成一笔订单
  const _body = clazz.name,
      _timeStamp = _.toInteger(_.now() / 1000),
      bookingNo = `${enumModel.userPayOutbizTypeEnum.CLAZZPAY.key}_${ _timeStamp }_${ uuidV4().substr(0, 4) }`;

  debug(_body);
  debug(bookingNo);

  _ip = PAYMENT_IP; //目前这里是写死的

  const payResult = paymentBase.initializePayResult();

  return requestAppUnifiedOrderPromise(
      systemConfig.APP_SHARK_CONFIG.APP_ID,
      systemConfig.APP_SHARK_CONFIG.PAY_MCH_ID,
      systemConfig.APP_SHARK_CONFIG.PAY_MCH_SECRET,
      `${ systemConfig.APP_BASE_URL }/api/wechat/payCallback`,
      bill.money,
      bookingNo,
      _body,
      _timeStamp,
      _ip)
      .catch((error) => {
        winston.error(error);

        payResult.message = '账单构建失败';
        payResult.success = false;

        return payResult;
      });
};

const CLAZZ_PAYING_STATUS_LIST = [enumModel.clazzJoinStatusEnum.PAYING.key, enumModel.clazzJoinStatusEnum.INVITATION.key, enumModel.clazzJoinStatusEnum.CANCELED.key];

/**
 * 从 payResult 中抽取签名信息
 * @param payResult
 * @returns {*}
 */
const extractedSignData = (payResult) => {
  // 加入签名信息和班级信息
  const signData = _.get(payResult, 'signData', {});
  // 去除无关信息
  delete signData.bookingNo;
  delete signData.totalFee;
  return signData;
};

/**
 * 生成课程支付微信账单
 *
 * @param currentClazzItem
 * @param clazzAccountItem
 * @param currentUserItem
 * @param clazzBill
 * @returns {Promise.<TResult>|Promise}
 */
const generateWechatPayBill = (currentClazzItem, clazzAccountItem, currentUserItem, clazzBill) => {
  return payForClazz(currentClazzItem, clazzAccountItem, currentUserItem, clazzBill)
      .then((payResult) => {
        // 如果账单校验失败，则返回参数错误
        if (payResult.success !== true) {
          return Promise.reject(commonError.PARAMETER_ERROR(payResult.message));
        }

        // 创建用户支付记录
        // 更新clazz_account状态
        return Promise.all(
            [
              userPayService.generateUserPay(currentUserItem, payWayEnum.wechat.key, payResult, clazzAccountItem.id, enumModel.userPayOutbizTypeEnum.CLAZZPAY.key, clazzBill),
              clazzAccountService.update({ id: clazzAccountItem.id, bill: JSON.stringify(clazzBill) })
            ])
            .then((results) => {
              debug(results);

              // 加入签名信息和班级信息
              const signData = extractedSignData(payResult);

              return {
                action: enumModel.clazzPaymentResultEnum.TOPAY.key,
                signData: signData,
                // 待支付的账单只要用户未填写信息则跳转
                redirectToPassport: !currentUserItem.hasFillInfo
              };
            });
      });
};

const generateAppPayBill = (currentClazzItem, clazzAccountItem, currentUserItem, clazzBill) => {
  return payForAppClazz(currentClazzItem, clazzAccountItem, currentUserItem, clazzBill)
      .then((payResult) => {
        // 如果账单校验失败，则返回参数错误
        if (payResult.success !== true) {
          return Promise.reject(commonError.PARAMETER_ERROR(payResult.message));
        }

        const payway = _.get(clazzBill, ['payway'], payWayEnum.wechat.key);

        // 创建用户支付记录
        // 更新clazz_account状态
        return Promise.all(
            [
              userPayService.generateUserPay(currentUserItem, payway, payResult, clazzAccountItem.id, enumModel.userPayOutbizTypeEnum.CLAZZPAY.key, clazzBill),
              clazzAccountService.update({ id: clazzAccountItem.id, bill: JSON.stringify(clazzBill) })
            ])
            .then((results) => {
              debug(results);

              // 加入签名信息和班级信息
              const signData = extractedSignData(payResult);

              return {
                action: enumModel.clazzPaymentResultEnum.TOPAY.key,
                signData: signData
              };
            });
      });
};

/**
 * 生成微信小程序支付账单
 *
 * @param currentClazzItem
 * @param clazzAccountItem
 * @param currentUserItem
 * @param clazzOneBill
 * @param weappOpenId
 * @returns {Promise.<TResult>}
 */
const generateWeappOnePayBill = (currentClazzItem, clazzAccountItem, currentUserItem, clazzOneBill, weappOpenId) => {
  return payForWeappOne(currentClazzItem.name, clazzOneBill, weappOpenId)
      .then((payResult) => {
        // 如果账单校验失败，则返回参数错误
        if (payResult.success !== true) {
          return Promise.reject(commonError.PARAMETER_ERROR(payResult.message));
        }

        // 创建用户支付记录
        // 更新clazz_account状态
        return userPayService.generateUserPay(currentUserItem, payWayEnum.wechat.key, payResult, clazzAccountItem.id, enumModel.userPayOutbizTypeEnum.WEAPPCLAZZONE.key, clazzOneBill)
            .then((userPayItem) => {
              debug(userPayItem);

              // 加入签名信息和班级信息
              const signData = extractedSignData(payResult);

              return {
                action: enumModel.clazzPaymentResultEnum.TOPAY.key,
                signData: signData
              };
            });
      });
};

const pub = {};

pub.clazzPayEndAspect = paymentEndAspect.clazzPayEndAspect;

/**
 * 笃师一对一支付完成后的统一处理
 *
 * @param clazzAccount
 * @param paymentBill
 * @returns {Promise|Promise.<T>}
 */
pub.weappOnePayEndAspect = (clazzAccount, paymentBill) => {
  debug('clazzAccount: %j', clazzAccount);
  debug('paymentBill: %j', paymentBill);

  // 学员的购买反馈次数增加
  const previousPurchasedFeedbackCount = clazzAccount.purchasedFeedbackCount || 0,
      currentClazzAccountId = clazzAccount.id;

  debug('previousPurchasedFeedbackCount: %d', previousPurchasedFeedbackCount);
  debug('currentClazzAccountId: %d', currentClazzAccountId);

  // 更新用户购买次数
  return clazzAccountService.update({
        id: currentClazzAccountId,
        purchasedFeedbackCount: previousPurchasedFeedbackCount + paymentBill.feedbackCount
      })
      .catch((error) => {
        winston.error(
            '更新clazzAccount[ %s ]的purchasedFeedbackCount为[ %d ]失败',
            currentClazzAccountId,
            previousPurchasedFeedbackCount
        );

        clazzAccountService.update({
              id: clazzAccount.id,
              purchasedFeedbackCount: previousPurchasedFeedbackCount
            })
            .catch((error) => {
              winston.error(
                  '复原clazzAccount[ %s ]的purchasedFeedbackCount为[ %d ]失败',
                  currentClazzAccountId,
                  previousPurchasedFeedbackCount
              );
              winston.error(error);
            });

        // 继续抛出错误
        throw error;
      });
};

/**
 * 班级支付预处理方法工厂
 *
 * @param clazzType
 * @returns {*}
 */
pub.clazzPaymentHandlerFactory = (clazzType) => {
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
            signData: {},
            // 只要用户未填写信息则跳转
            redirectToPassport: !currentUserItem.hasFillInfo
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

        return Promise.all([createClazzAccountPromise, paymentBase.isBillValid(clazzBill, currentUserItem, currentClazzItem)])
            .then((results) => {
              const clazzAccountItem = results[0],
                  checkResult = results[1];

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
              return generateWechatPayBill(currentClazzItem, clazzAccountItem, currentUserItem, clazzBill);
            })
      };
    case enumModel.clazzTypeEnum.SEMESTER.key:
    case enumModel.clazzTypeEnum.LTS.key:
    case enumModel.clazzTypeEnum.PROMOTION.key:
      return (clazzBill, currentClazzItem, currentUserItem, currentClazzAccountItem) => {

        debug(clazzBill);

        // 验证课程是否已经开放报名
        if (currentClazzItem.status !== enumModel.clazzStatusEnum.OPEN.key) {
          return Promise.reject(commonError.PARAMETER_ERROR('课程未开放'));
        }

        const createClazzAccountPromise = _.isNil(currentClazzAccountItem)
            ? clazzAccountService.userJoinClazz(currentUserItem, currentClazzItem)
            : Promise.resolve(currentClazzAccountItem);

        return Promise.all([createClazzAccountPromise, paymentBase.isBillValid(clazzBill, currentUserItem, currentClazzItem)])
            .then((results) => {
              const clazzAccountItem = results[0],
                  checkResult = results[1];

              debug(clazzAccountItem);
              debug(checkResult);

              // 2. 是否已经加入班级
              if (!_.includes(CLAZZ_PAYING_STATUS_LIST, clazzAccountItem.status)) {
                return {
                  action: enumModel.clazzPaymentResultEnum.ALREADY_JOIN.key,
                  // 签名信息为空
                  signData: {},
                  // 如果当前用户未填写信息，并且加入班级状态为待加入 则需要跳转
                  redirectToPassport: !currentUserItem.hasFillInfo && clazzAccountItem.status === enumModel.clazzJoinStatusEnum.WAITENTER.key
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
              return generateWechatPayBill(currentClazzItem, clazzAccountItem, currentUserItem, clazzBill);
            })
      };
    default:
      return Promise.reject(commonError.PARAMETER_ERROR('未知班级类型，参数错误'));
  }
};

/**
 * 检查账单，并生成账单
 *
 * @param paymentBill
 * @param currentClazzItem
 * @param currentUserItem
 * @param currentClazzAccountItem
 * @param weappUserInfo
 * @returns {*}
 */
pub.weappOnePaymentHandler = (paymentBill, currentClazzItem, currentUserItem, currentClazzAccountItem, weappUserInfo) => {
  // 进行中的课程状态列表
  const AVAILABLE_CLAZZ_STATUS_LIST = [enumModel.clazzStatusEnum.OPEN.key, enumModel.clazzStatusEnum.PROCESSING.key];

  // 检查课程是否未结束
  if (!_.includes(AVAILABLE_CLAZZ_STATUS_LIST, currentClazzItem.status)) {
    return Promise.reject(commonError.PARAMETER_ERROR('课程已结束'));
  }

  // 获取反馈价格配置
  const clazzPriceConfig = _.get(currentClazzItem, 'feedbackConfig.priceConfig', {});
  const toPurchaseFeedbackCount = paymentBill.feedbackCount;

  // 支付金额检查
  if (paymentBill.money !== clazzPriceConfig[toPurchaseFeedbackCount]) {
    return Promise.reject(commonError.PARAMETER_ERROR('支付金额错误'));
  }

  // 支付账单
  return generateWeappOnePayBill(currentClazzItem, currentClazzAccountItem, currentUserItem, paymentBill, weappUserInfo.openId);
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

        return Promise.all([createClazzAccountPromise, paymentBase.isBillValid(clazzBill, currentUserItem, currentClazzItem)])
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

        // 验证课程是否已经开放报名
        if (currentClazzItem.status !== enumModel.clazzStatusEnum.OPEN.key) {
          return Promise.reject(commonError.PARAMETER_ERROR('课程未开放'));
        }

        const createClazzAccountPromise = _.isNil(currentClazzAccountItem)
            ? clazzAccountService.userJoinClazz(currentUserItem, currentClazzItem)
            : Promise.resolve(currentClazzAccountItem);

        return Promise.all([createClazzAccountPromise, paymentBase.isBillValid(clazzBill, currentUserItem, currentClazzItem)])
            .then(([clazzAccountItem, checkResult]) => {

              debug(clazzAccountItem);
              debug(checkResult);

              // 2. 是否已经加入班级
              if (!_.includes(CLAZZ_PAYING_STATUS_LIST, clazzAccountItem.status)) {
                return {
                  action: enumModel.clazzPaymentResultEnum.ALREADY_JOIN.key,
                  // 签名信息为空
                  signData: {},
                  // 如果当前用户未填写信息，并且加入班级状态为待加入 则需要跳转
                  redirectToPassport: !currentUserItem.hasFillInfo && clazzAccountItem.status === enumModel.clazzJoinStatusEnum.WAITENTER.key
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
            })
      };
    default:
      return Promise.reject(commonError.PARAMETER_ERROR('未知班级类型，参数错误'));
  }
};

module.exports = pub;
