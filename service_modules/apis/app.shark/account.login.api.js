'use strict';

/**
 * shark app 微信相关处理API
 */
const _  = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');
const winston = require('winston');
const bcrypt = require('bcrypt');

const systemConfig = require('../../../config/config');

const apiUtil = require('./../util/api.util');
const jwtUtil = require('../util/jwt.util');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const accountLoginSchema = require('./schema/account.login.schema');

const wechatAuth = require('../../lib/wechat.auth');

const userService = require('../../services/user.service');
const userBindService = require('../../services/userBind.service');
const systemConfigService = require('../../services/systemConfig.service');
const smsSecurityCodeService = require('../../services/smsSecurityCode.service');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const comparePasswordPromise = Promise.promisify(bcrypt.compare);

const pub = {};

const isValidSecurityCode = (latestCodeItem, securityCode) => {
  return !_.isNil(latestCodeItem) && securityCode === latestCodeItem.code &&
      moment().isBefore(latestCodeItem.expireAt);
};

/**
 * 微信登录授权
 *
 * @param req
 * @param res
 */
pub.authWechatLogin = (req, res) => {
  return schemaValidator.validatePromise(accountLoginSchema.wechatAuthBodySchema, req.body)
      .then((authBody) => {
        debug(debug);

        return wechatAuth.requestUserItemByAuthCode(
            systemConfig.APP_SHARK_CONFIG.APP_ID,
            systemConfig.APP_SHARK_CONFIG.SECRET,
            authBody.code,
            enumModel.userBindTypeEnum.APP_SHARK.key
        );
      })
      .then((userItem) => {
        // 签名， token
        const userObj = { appUserId: userItem.id };

        return jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 使用手机号及密码登录
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.authPhonenumberLogin = (req, res) => {
  return schemaValidator.validatePromise(accountLoginSchema.phoneNumberAuthBodySchema, req.body)
      .then((authBody) => {
        debug(authBody);

        return userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, authBody.phoneNumber)
            .then((userBindItem) => {
              debug(userBindItem);

              if (_.isNil(userBindItem)) {
                return Promise.reject(commonError.PARAMETER_ERROR("用户名或密码错误"));
              }

              // 校验密码
              return comparePasswordPromise(authBody.password, userBindItem.password)
                  .then(isValidPassword => {
                    debug(isValidPassword);

                    if (isValidPassword !== true) {
                      return Promise.reject(commonError.PARAMETER_ERROR("用户名或密码错误"));
                    }

                    // 签名， token
                    const userObj = { appUserId: userBindItem.userId };

                    const signTokenPromise = jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options);
                    const fetchUserInfoPromise = userService.fetchById(userBindItem.userId);

                    return Promise.all([signTokenPromise, fetchUserInfoPromise])
                        .then(([token, userItem]) => {
                          debug(token);
                          debug(userItem);

                          if (_.isNil(userItem)) {
                            return Promise.reject(commonError.BIZ_FAIL_ERROR("不存在的用户，请联系客服"));
                          }

                          res.set('X-Auth-Token', token);

                          return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
                        });
                  });
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 使用手机和验证码登录
 * @param req
 * @param res
 */
pub.authWithSmsCode = (req, res) => {
  return schemaValidator.validatePromise(accountLoginSchema.smsAuthBody, req.body)
      .then((codeBody) => {
        const phoneNumber = codeBody.phoneNumber,
            securityCode = codeBody.code;

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.SMS_LOGIN.key, phoneNumber);

        return Promise.all([fetchUserBindPromise, fetchLatestCodePromise])
            .then(([userBindItem, latestCodeItem]) => {
              debug(userBindItem);
              debug(latestCodeItem);

              if (!isValidSecurityCode(latestCodeItem, securityCode)) {
                winston.error(`手机号 ${phoneNumber} 及 ${securityCode} 验证失败`);
                return Promise.reject(commonError.PARAMETER_ERROR('验证失败'));
              }

              if (_.isNil(userBindItem)) {
                winston.error(`手机号 ${phoneNumber} 未注册`);
                //如果用户未注册，进入注册逻辑
                return userService.registerUserItem({
                  name: phoneNumber,
                  headImgUrl: systemConfig.APP_SHARK_CONFIG.DEFAULT_ICON,
                  saltHashedPassword: '&#*(!@&#*@!#^&@*KJHJKSDHKJ*@', //使用永远不能hash的密码
                  phoneNumber: phoneNumber,
                  sex: 0
                }).then((userItem)=>{
                  const createUserBindPromise = userBindService.createBindUser(
                      userItem.id,
                      enumModel.userBindTypeEnum.PHONE_NUMBER.key,
                      phoneNumber,
                      userItem.saltHashedPassword
                  );
                  const userObj = {appUserId: userItem.id};
                  const signTokenPromise = jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options);

                  return Promise.all([createUserBindPromise, signTokenPromise])
                      .then(([userBindItem, token]) => {
                        debug(userBindItem);
                        debug(token);

                        res.set('X-Auth-Token', token);

                        return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
                      });
                });
              }else{
                // 签名， token
                const userObj = { appUserId: userBindItem.userId };
                const signTokenPromise = jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options);
                const fetchUserInfoPromise = userService.fetchById(userBindItem.userId);
                return Promise.all([signTokenPromise, fetchUserInfoPromise])
                    .then(([token, userItem]) => {
                      debug(token);
                      debug(userItem);

                      if (_.isNil(userItem)) {
                        return Promise.reject(commonError.BIZ_FAIL_ERROR("不存在的用户，请联系客服"));
                      }

                      res.set('X-Auth-Token', token);

                      return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
                    });
              }
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 发送登录验证码
 * @param req
 * @param res
 */
pub.sendLoginSmsCode = (req, res) =>{
  return schemaValidator.validatePromise(accountLoginSchema.sendCodeBodyAuth, req.body)
      .then((codeBody) => {
        debug(codeBody);

        const phoneNumber = codeBody.phoneNumber;

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchSmsConfigPromise = systemConfigService.fetchSystemConfigByType(enumModel.systemConfigTypeEnum.SMS_CONFIG.key);

        return Promise.all([fetchUserBindPromise, fetchSmsConfigPromise])
            .then(([userBindItem, smsConfig]) => {
              debug(userBindItem);
              debug(smsConfig);

              if (_.isNil(userBindItem)) {
                winston.error(`手机号 ${phoneNumber} 未注册`);
                //return Promise.reject(commonError.PARAMETER_ERROR('您没有注册'));
              }

              return smsSecurityCodeService.sendLoginCode(phoneNumber, 5);
            })
            .then((smsItem) => {
              debug(smsItem);
              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
