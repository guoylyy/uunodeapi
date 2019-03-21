'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('controller');
const winston = require('winston');
const xml2js = require('xml2js');

const systemConfig = require('../../../config/config');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const wechatSchema = require('./schema/wechat.schema');
const commonError = require('../../services/model/common.error');
const enumModel = require('../../services/model/enum');

const apiUtil = require('../util/api.util');
const jwtUtil = require('../util/jwt.util');

const wechatAuth = require('../../lib/wechat.auth');
const wechatSign = require('../../lib/wechat.sign');
const wechatEventHandler = require('../../lib/wechat.event.handler');
const wechatMessageHandler = require('../../lib/wechat.message.handler');
const wechatPayment = require('../../lib/wechat.payment');
const wechatUser = require('../../lib/wechat.user');

const userService = require('../../services/user.service');
const clazzService = require('../../services/clazz.service');
const userPayService = require('../../services/userPay.service');
const clazzAccountService = require('../../services/clazzAccount.service');

/**
 * 微信事件处理器
 *
 * @param params
 * @returns {*}
 */
const wechatHandler = (params) => {
  debug(params);
  // 进行签名验证
  if (params.signature) {
    if (wechatSign.checkSignature(params.signature, params.timestamp, params.nonce)) {
      return Promise.resolve(params.echostr);
    }

    return Promise.reject(commonError.UNAUTHORIZED_ERROR('Wecaht Unauthorized'));
  }

  // 事件，消息处理
  if (_.isNil(params) || _.isNil(params.xml)) {
    winston.error('Wechat Message Data Structure Error: %j', params);
    return Promise.reject(commonError.PARAMETER_ERROR('Wechat Message Data Structure Error'));
  }

  const msgType = params.xml.MsgType[0],
      openId = params.xml.FromUserName[0];

  return wechatUser.requestUserInfoThenSignUpIfAbsent(openId)
      .then((userItem) => {
        debug(userItem);

        //判断是哪些人登陆，构建一个个人信息
        let loginInfo = {
          isVerify: false,
          hasRegister: false,
          account: null,
          isTeacher: false,
          openId: openId
        };

        if (!_.isNil(userItem)) {
          loginInfo.hasRegister = true;
          loginInfo.account = userItem;
        }

        // TODO 微信消息/事件处理现在未考虑笃师消息
        debug(loginInfo);

        /**
         * 开始处理消息
         */
        if (msgType === 'event') {
          return wechatEventHandler(params, loginInfo);
        }

        //处理多媒体和文本消息
        return wechatMessageHandler(params, loginInfo);
      })
};

let pub = {};

/**
 * 获取微信授权地址
 *
 * @param req
 * @param res
 */
pub.fetchWechatAuthUrl = (req, res) => {
  schemaValidator.validatePromise(wechatSchema.wechatAuthQuerySchema, req.query)
      .then((authBody) => {
        debug(authBody);
        let url = wechatAuth.getWechatAuthUrl(systemConfig.WECHAT_APP_CONFIG.APP_ID, systemConfig.BASE_URL + authBody.url);
        debug(url);

        return apiRender.renderBaseResult(res, url);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 微信登录授权
 *
 * @param req
 * @param res
 */
pub.authWechatLogin = (req, res) => {

  let accessToken, unionId, openId;
  return schemaValidator.validatePromise(wechatSchema.wechatAuthBodySchema, req.body)
      .then((authBody) => {
        return wechatAuth.requestWechatAuthAccessToken(systemConfig.WECHAT_APP_CONFIG.APP_ID, systemConfig.WECHAT_APP_CONFIG.SECRET, authBody.code)
      })
      .then((results) => {
        debug(results);

        accessToken = results[0];
        openId = results[1];
        unionId = results[2];

        if (global.IS_DEVLOPMENT_ENVIRONMENT === true) {
          return userService.fetchByOpenId(openId);
        } else {
          return userService.fetchByUnionid(unionId);
        }
      })
      .then((userItem) => {
        debug(userItem);
        if (!userItem) {
          // 如果用户信息不存在，则先从微信获取用户信息，然后注册
          return wechatAuth.requestWechatUserinfo(accessToken, openId)
              .then((userObject) => {
                debug(userObject);
                return userService.wechatSignUp(userObject);
              })
        }

        // 如果用户的openId与解析的openId不一致，则更新之
        if (openId !== userItem.openId) {
          userService.updateUserItem(
              userItem.id,
              {
                openId: openId
              }
          );
        }

        return userItem;
      })
      .then((userItem) => {
        // 签名， token
        const userObj = { id: userItem.id };
        return jwtUtil.sign(userObj, systemConfig.jwt.secretKey, systemConfig.jwt.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 让微信测试服务器是否通畅
 *
 * @param req
 * @param res
 */
pub.wechatEventRegister = (req, res) => {
  return wechatHandler(req.query)
      .then((data) => {
        debug(data);
        return res.send(data);
      })
      .catch((error) => {
        winston.error('error: %j', error);
        return res.status(error.code || 500).send(error.message);
      });
};

/**
 * 微信公众号消息接口
 *
 * @param req
 * @param res
 */
pub.wechatMsgHandler = (req, res) => {
  return wechatHandler(req.body)
      .then((baseResult) => {
        // 如果回复消息不为Object， 则直接回复 success
        if (!_.isPlainObject(baseResult)) {
          return res.send('success');
        }

        var biz = baseResult.biz;
        let builder = new xml2js.Builder();
        let xml = builder.buildObject(baseResult);

        if (biz == 'subscribe') {
          delete baseResult.biz;
          xml = builder.buildObject(baseResult);
          //替换,修复nodejs不能重复key的问题
          xml = xml.replace(/item1/gi, 'item');
          xml = xml.replace(/item2/gi, 'item');
          xml = xml.replace(/<id\/>/gi, '');
        }
        res.set('Content-Type', 'text/xml');
        return res.send(xml);
      })
      .catch((error) => {
        winston.error(error);
        return res.status(error.code || 500).send(error.message);
      });
};

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

            const toUpdateUserPay = {
              id: userPay.id,
              status: enumModel.payStatusEnum.PAY_SUCCESS.key,
              transactionId: transactionId
            };
            debug(toUpdateUserPay);

            // 1. 更新用户支付记录
            // 2. 根据账单中的outBizId查询clazzAccount记录
            const promiseList = Promise.all(
                [
                  userPayService.updateUserPay(toUpdateUserPay),
                  clazzAccountService.fetchClazzAccountById(clazzAccountId)
                ])
                .catch(winston.error);

            // 仅当为课程支付的时候才继续处理
            if (outBizType === enumModel.userPayOutbizTypeEnum.CLAZZPAY.key) {
              promiseList.then(
                  (results) => {
                    const updatedUserPay = results[0],
                        clazzAccountItem = results[1];

                    debug(updatedUserPay);
                    debug(clazzAccountItem);

                    const userId = clazzAccountItem.userId,
                        clazzId = clazzAccountItem.clazzId,
                        clazzBill = JSON.parse(clazzAccountItem.bill || null);

                    debug(userId);
                    debug(clazzId);
                    debug(clazzBill);

                    return Promise.all([clazzService.fetchClazzById(clazzId), userService.fetchById(userId)])
                        .then((results) => {
                          const clazzItem = results[0],
                              userItem = results[1];

                          debug(clazzItem);
                          debug(userItem);

                          return wechatPayment.clazzPayEndAspect(userItem, clazzItem, clazzAccountItem, clazzBill, userPay);
                        });
                  })
                  .catch(winston.error);
            }
          }
        })
        .catch(winston.error);
  }

  // 直接返回成功
  const builder = new xml2js.Builder();
  const xml = builder.buildObject({ 'xml': { 'return_code': 'SUCCESS' } });

  res.set('Content-Type', 'text/xml');
  return res.send(xml);
};

/**
 * 微信jsSDK签名
 *
 * @param req
 * @param res
 */
pub.signJsSdk = (req, res) => {
  let url;
  schemaValidator.validatePromise(wechatSchema.wechatJsSdkSignQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        url = systemConfig.BASE_URL + queryParam.url;

        return wechatSign.signUrl(url);
      })
      .then((signResult) => {
        debug(signResult);

        wechatSign.checkSignature(signResult.signature, signResult.timestamp, signResult.nonceStr)

        return apiRender.renderBaseResult(res, signResult);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
