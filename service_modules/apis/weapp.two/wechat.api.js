'use strict';
/**
 *  友班打卡程序API接口
 *   * 登录小程序
 *   * 拉取用户信息（获取UnionId）
 *  
 */
const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const Promise = require('bluebird');
const xml2js = require('xml2js');

const systemConfig = require('../../../config/config');

const apiRender = require('../render/api.render');
const apiUtil = require('../util/api.util');
const jwtUtil = require('../util/jwt.util');

const schemaValidator = require('../schema.validator');
const wechatSchema = require('./schema/wechat.schema');

const wechatUser = require('../../lib/wechat.user');
const wechatPayment = require('../../lib/wechat.payment');

const enumModel = require('../../services/model/enum');

const userService = require('../../services/user.service');
const userPayService = require('../../services/userPay.service');
const userLikeService = require('../../services/userLike.service');
const clazzAccountService = require('../../services/clazzAccount.service');

/**
 * 用户签名
 * @param {*} userItem 
 * @param {*} res 
 */
const signUserItem = (userItem, res) => {
  // 签名， token
  const weappUserObj = { weappUserId: userItem.id };
  return jwtUtil.sign(weappUserObj, systemConfig.jwt_weapp_one.secretKey, systemConfig.jwt_weapp_one.options)
      .then((token) => {
        res.set('X-Auth-Token', token);

        const pickedUserInfo = apiUtil.pickUserBasicInfo(userItem);

        return apiRender.renderBaseResult(res, _.extend(pickedUserInfo, { 'X-Auth-Token': token }));
      });
};

let pub = {};

/**
 *微信小程序登录授权
 *
 * @param req
 * @param res
 */
pub.authWechatLogin = (req, res) => {
  schemaValidator.validatePromise(wechatSchema.weappAuthBodySchema, req.body)
      .then((authBody) => {
        debug(authBody);
        return wechatUser.requestWeappUserInfoThenSignupIfAbsent(authBody.code, authBody.encryptedData, authBody.iv);
      })
      .then((userItem) => {
        //如果是新用户，需要给与积分
        if(userItem['isNewUser']){
          //新建积分
          return userLikeService.createUserLike(userItem.id, enumModel.userLikeTaskEnum.REGISTRATION_TASK.key,
              enumModel.userLikeTaskEnum.REGISTRATION_TASK.name,'WECHAT_MINI_KY', 10)
              .then((userLikeItem)=>{
                winston.info('Create UserLike', userLikeItem);
                return signUserItem(userItem, res);
              });
        }
        winston.info('Direct Register', userItem);
        return signUserItem(userItem, res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: POST /user/auth
 * 账户登录，用户认证
 *
 * @param req
 * @param res
 */
pub.auth = (req, res) => {
  schemaValidator.validatePromise(wechatSchema.userLoginBodySchema, req.body)
      .then((loginUser) => {
        debug(loginUser);
        return userService.login(loginUser.username, loginUser.password)
      })
      .then((userItem) => signUserItem(userItem, res))
      .catch(req.__ERROR_HANDLER);
};

/**
 * 笃师一对一支付回调
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
          const userPayStatus = userPay.status;

          winston.info('[payment_callback_processing] %s | %s', outTradeNo, userPayStatus);

          // 仅当 待付款记录存在 且为 待支付状态 才进行后续处理
          if (_.isNil(userPay) && userPayStatus !== enumModel.payStatusEnum.PAYING.key) {
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

            // 仅当为 笃师一对一 的时候才继续处理
            if (outBizType === enumModel.userPayOutbizTypeEnum.WEAPPCLAZZONE.key) {
              return promiseList.then(
                  (results) => {
                    const updatedUserPay = results[0],
                        clazzAccountItem = results[1];

                    debug(updatedUserPay);
                    debug(clazzAccountItem);

                    const weappOneBill = JSON.parse(userPay.bill || null);

                    debug(weappOneBill);

                    return wechatPayment.weappOnePayEndAspect(clazzAccountItem, weappOneBill);
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

module.exports = pub;
