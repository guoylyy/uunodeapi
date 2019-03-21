'use strict';

/**
 * shark app 微信相关处理API
 */
const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');
const bcrypt = require('bcrypt');

const systemConfig = require('../../../config/config');

const apiUtil = require('./../util/api.util');
const jwtUtil = require('../util/jwt.util');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const accountRegisterSchema = require('./schema/account.register.schema');

const wechatAuth = require('../../lib/wechat.auth');

const userService = require('../../services/user.service');
const userBindService = require('../../services/userBind.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const systemConfigService = require('../../services/systemConfig.service');
const smsSecurityCodeService = require('../../services/smsSecurityCode.service');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const hashPasswordPromise = Promise.promisify(bcrypt.hash);

const isValidSecurityCode = (latestCodeItem, securityCode) => {
  return !_.isNil(latestCodeItem) && securityCode === latestCodeItem.code &&
      moment().isBefore(latestCodeItem.expireAt);
};

const pub = {};

/**
 * 发送注册验证短信
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.sendRegisterCode = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.sendCodeBodyAuth, req.body)
      .then((codeBody) => {
        debug(codeBody);

        const phoneNumber = codeBody.phoneNumber;

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchSmsConfigPromise = systemConfigService.fetchSystemConfigByType(enumModel.systemConfigTypeEnum.SMS_CONFIG.key);

        return Promise.all([fetchUserBindPromise, fetchSmsConfigPromise])
            .then(([userBindItem, smsConfig]) => {
              debug(userBindItem);
              debug(smsConfig);

              if (!_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 已注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('用户已注册'));
              }

              const limit = _.get(smsConfig, 'registerLimit');

              return smsSecurityCodeService.sendRegisterCode(phoneNumber, limit);
            })
            .then((smsItem) => {
              debug(smsItem);

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 检查注册验证码
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.checkRegisterCode = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.checkCodeBodyAuth, req.body)
      .then((codeBody) => {
        const phoneNumber = codeBody.phoneNumber,
            securityCode = codeBody.code;

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.REGISTER.key, phoneNumber);

        return Promise.all([fetchUserBindPromise, fetchLatestCodePromise])
            .then(([userBindItem, latestCodeItem]) => {
              debug(userBindItem);
              debug(latestCodeItem);

              if (!_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 已注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('用户已注册'));
              }

              if (!isValidSecurityCode(latestCodeItem, securityCode)) {
                winston.error(`手机号 ${ phoneNumber } 及 ${ securityCode } 验证失败`);
                return Promise.reject(commonError.PARAMETER_ERROR('验证失败'));
              }

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 初始化账户
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.initAccountByPhonenumber = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.setPasswordBody, req.body)
      .then((accountBody) => {
        debug(accountBody);

        const phoneNumber = accountBody.phoneNumber,
            securityCode = accountBody.code;

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.REGISTER.key, phoneNumber);

        return Promise.all([fetchUserBindPromise, fetchLatestCodePromise])
            .then(([userBindItem, latestCodeItem]) => {
              debug(userBindItem);
              debug(latestCodeItem);

              if (!_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 已注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('用户已注册'));
              }

              if (!isValidSecurityCode(latestCodeItem, securityCode)) {
                winston.error(`手机号 ${ phoneNumber } 及 ${ securityCode } 验证失败`);
                return Promise.reject(commonError.PARAMETER_ERROR('验证失败'));
              }

              const expireSecurityCodePromise = smsSecurityCodeService.expireSecurityCode(latestCodeItem.id);
              const hashPromise = hashPasswordPromise(accountBody.password, systemConfig.APP_SHARK_CONFIG.SALT_FOUNDS);

              return Promise.all([hashPromise, expireSecurityCodePromise]);
            })
            .then(([hashedPassword, expiredCodeItem]) => {
              debug(hashedPassword);
              debug(expiredCodeItem);

              return userService.registerUserItem({
                name: phoneNumber,
                headImgUrl: systemConfig.APP_SHARK_CONFIG.DEFAULT_ICON,
                saltHashedPassword: hashedPassword,
                phoneNumber: phoneNumber,
                sex: 0
              });
            })
            .then((userItem) => {
              const createUserBindPromise = userBindService.createBindUser(
                  userItem.id,
                  enumModel.userBindTypeEnum.PHONE_NUMBER.key,
                  phoneNumber,
                  userItem.saltHashedPassword
              );

              // 签名， token
              const userObj = { appUserId: userItem.id };
              const signTokenPromise = jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options);

              return Promise.all([createUserBindPromise, signTokenPromise])
                  .then(([userBindItem, token]) => {
                    debug(userBindItem);
                    debug(token);

                    res.set('X-Auth-Token', token);

                    return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
                  });
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 发送重置密码验证码
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.sendResetPasswordCode = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.sendCodeBodyAuth, req.body)
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
                winston.error(`手机号 ${ phoneNumber } 未注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('用户未注册'));
              }

              const limit = _.get(smsConfig, 'registerLimit');

              return smsSecurityCodeService.sendResetPasswordCode(userBindItem.userId, phoneNumber, limit);
            })
            .then((smsItem) => {
              debug(smsItem);

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 检查重置密码验证码
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.checkRestPasswordCode = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.checkCodeBodyAuth, req.body)
      .then((codeBody) => {
        const phoneNumber = codeBody.phoneNumber,
            securityCode = codeBody.code;

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.RESET_PASSWORD.key, phoneNumber);

        return Promise.all([fetchUserBindPromise, fetchLatestCodePromise])
            .then(([userBindItem, latestCodeItem]) => {
              debug(userBindItem);
              debug(latestCodeItem);

              if (_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 未注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('用户未注册'));
              }

              if (!isValidSecurityCode(latestCodeItem, securityCode)) {
                winston.error(`手机号 ${ phoneNumber } 及 ${ securityCode } 验证失败`);
                return Promise.reject(commonError.PARAMETER_ERROR('验证失败'));
              }

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 账户重置密码
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.resetAccountPassword = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.setPasswordBody, req.body)
      .then((accountBody) => {
        debug(accountBody);

        const phoneNumber = accountBody.phoneNumber,
            securityCode = accountBody.code;

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.RESET_PASSWORD.key, phoneNumber);

        return Promise.all([fetchUserBindPromise, fetchLatestCodePromise])
            .then(([userBindItem, latestCodeItem]) => {
              debug(userBindItem);
              debug(latestCodeItem);

              if (_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 未注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('用户未注册'));
              }

              if (!isValidSecurityCode(latestCodeItem, securityCode)) {
                winston.error(`手机号 ${ phoneNumber } 及 ${ securityCode } 验证失败`);
                return Promise.reject(commonError.PARAMETER_ERROR('验证失败'));
              }

              const expireSecurityCodePromise = smsSecurityCodeService.expireSecurityCode(latestCodeItem.id);
              const hashPromise = hashPasswordPromise(accountBody.password, systemConfig.APP_SHARK_CONFIG.SALT_FOUNDS);

              return Promise.all([hashPromise, expireSecurityCodePromise])
                  .then(([hashedPassword, expiredCodeItem]) => {
                    debug(hashedPassword);
                    debug(expiredCodeItem);

                    const updateUserPromise = userService.updateUserItem(
                        userBindItem.userId,
                        {
                          saltHashedPassword: hashedPassword
                        }
                    );

                    const updateUserBindPromise = userBindService.updateUserBindItem({
                      id: userBindItem.id,
                      password: hashedPassword
                    });

                    return Promise.all([updateUserPromise, updateUserBindPromise])
                  });
            });
      })
      .then(([updatedUserItem, updatedUserBindItem]) => {
        debug(updatedUserItem);
        debug(updatedUserBindItem);

        // 签名， token
        const userObj = { appUserId: updatedUserItem.id };

        return jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options);
      })
      .then((token) => {
        debug(token);

        res.set('X-Auth-Token', token);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 关联手机号
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.sendPrivacyPhonenumberRegisterCode = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.sendCodeBodyAuth, req.body)
      .then((codeBody) => {
        debug(codeBody);

        const phoneNumber = codeBody.phoneNumber;
        req.__MODULE_LOGGER("关联手机号", phoneNumber);

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchSmsConfigPromise = systemConfigService.fetchSystemConfigByType(enumModel.systemConfigTypeEnum.SMS_CONFIG.key);

        return Promise.all([fetchUserBindPromise, fetchSmsConfigPromise])
            .then(([userBindItem, smsConfig]) => {
              debug(userBindItem);
              debug(smsConfig);

              if (!_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 已注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('手机号已注册'));
              }

              const limit = _.get(smsConfig, 'registerLimit');

              return smsSecurityCodeService.sendRegisterCode(phoneNumber, limit, req.__CURRENT_USER.id);
            })
            .then((smsItem) => {
              debug(smsItem);

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 验证关联手机号验证码
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.checkPrivacyPhonenumberRegisterCode = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.checkCodeBodyAuth, req.body)
      .then((codeBody) => {
        const phoneNumber = codeBody.phoneNumber,
            securityCode = codeBody.code;

        req.__MODULE_LOGGER("验证关联手机号验证码", codeBody);

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.REGISTER.key, phoneNumber);

        return Promise.all([fetchUserBindPromise, fetchLatestCodePromise])
            .then(([userBindItem, latestCodeItem]) => {
              debug(userBindItem);
              debug(latestCodeItem);

              if (!_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 已注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('手机号已注册'));
              }

              if (!isValidSecurityCode(latestCodeItem, securityCode)) {
                winston.error(`手机号 ${ phoneNumber } 及 ${ securityCode } 验证失败`);
                return Promise.reject(commonError.PARAMETER_ERROR('验证失败'));
              }

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 关联手机号
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.connectAccountPrivacyPhonenumber = (req, res) => {
  return schemaValidator.validatePromise(accountRegisterSchema.setPasswordBody, req.body)
      .then((accountBody) => {
        debug(accountBody);

        const phoneNumber = accountBody.phoneNumber,
            securityCode = accountBody.code;

        req.__MODULE_LOGGER("关联手机号", accountBody);

        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.REGISTER.key, phoneNumber);

        return Promise.all([fetchUserBindPromise, fetchLatestCodePromise])
            .then(([userBindItem, latestCodeItem]) => {
              debug(userBindItem);
              debug(latestCodeItem);

              if (!_.isNil(userBindItem)) {
                winston.error(`手机号 ${ phoneNumber } 已注册`);
                return Promise.reject(commonError.PARAMETER_ERROR('手机号已注册'));
              }

              if (!isValidSecurityCode(latestCodeItem, securityCode)) {
                winston.error(`手机号 ${ phoneNumber } 及 ${ securityCode } 验证失败`);
                return Promise.reject(commonError.PARAMETER_ERROR('验证失败'));
              }

              const expireSecurityCodePromise = smsSecurityCodeService.expireSecurityCode(latestCodeItem.id);
              const hashPromise = hashPasswordPromise(accountBody.password, systemConfig.APP_SHARK_CONFIG.SALT_FOUNDS);

              return Promise.all([hashPromise, expireSecurityCodePromise]);
            })
            .then(([hashedPassword, expiredCodeItem]) => {
              debug(hashedPassword);
              debug(expiredCodeItem);

              const currentUserId = req.__CURRENT_USER.id;

              const updateUserPromise = userService.updateUserItem(
                  currentUserId,
                  {
                    saltHashedPassword: hashedPassword,
                    phoneNumber: phoneNumber,
                  }
              );

              const createUserBindPromise = userBindService.createBindUser(
                  currentUserId,
                  enumModel.userBindTypeEnum.PHONE_NUMBER.key,
                  phoneNumber,
                  hashedPassword
              );

              return Promise.all([updateUserPromise, createUserBindPromise]);
            })
            .then(([updatedUserItem, userBindItem]) => {
              debug(updatedUserItem);
              debug(userBindItem);

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

pub.fetchAccountPrivacyWechat = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(
            res,
            {
              hasBindWechat: !_.isNil(req.__CURRENT_USER.openId)
            }
        );
      })
};

/**
 * 关联微信号
 *
 * @param req
 * @param res
 */
pub.connectAccountPrivacyWechat = (req, res) => {
  const currentUser = req.__CURRENT_USER;

  return schemaValidator.validatePromise(accountRegisterSchema.wechatAuthBodySchema, req.body)
      .then((authBody) => {
        debug(authBody);

        req.__MODULE_LOGGER("关联微信号", authBody);

        if (!_.isNil(currentUser.openId)) {
          return Promise.reject(commonError.PARAMETER_ERROR("已关联微信号"));
        }

        const requestUserPromise = wechatAuth.requestUserItemByAuthCode(
            systemConfig.APP_SHARK_CONFIG.APP_ID,
            systemConfig.APP_SHARK_CONFIG.SECRET,
            authBody.code,
            enumModel.userBindTypeEnum.APP_SHARK.key,
            currentUser
        );

        const fetchUserBindListPromise = userBindService.fetchAllBindUser(currentUser.id);

        return Promise.all([requestUserPromise, fetchUserBindListPromise])
      })
      .then(([userItem, userBindList]) => {
        debug(userItem);

        const updateUserBindPromiseList = _.map(userBindList, (userBindItem) => {
          return userBindService.updateUserBindItem({
            id: userBindItem.id,
            userId: userItem.id
          });
        });

        // 签名， token
        const userObj = { appUserId: userItem.id };
        const signTokePromise = jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options);

        return Promise.all([Promise.all(updateUserBindPromiseList), signTokePromise])
      })
      .then(([updatedUserBindList, token]) => {
        debug(updatedUserBindList);
        debug(token);

        res.set('X-Auth-Token', token);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
