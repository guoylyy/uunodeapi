'use strict';

const debug = require('debug')('controller');
const winston = require('winston');
const moment = require('moment');

const apiUtil = require('./../util/api.util');
const jwtUtil = require('../util/jwt.util');

const systemConfig = require('../../../config/config');

const apiRender = require('../render/api.render');
const commonError = require('../../services/model/common.error');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const wechatSchema = require('./schema/wechat.schema');
const userSchema = require('./schema/user.schema');

const wechatAuth = require('../../lib/wechat.auth');

const userService = require('../../services/user.service');

let pub = {};

/**
 * API: POST /user/auth
 * 账户登录，用户认证
 *
 * @param req
 * @param res
 */
pub.auth = (req, res) => {
  schemaValidator.validatePromise(userSchema.userLoginBodySchema, req.body)
      .then((loginUser) => {
        debug(loginUser);
        return userService.login(loginUser.username, loginUser.password)
      })
      .then((userItem) => {
        debug(userItem);
        if (!userItem) {
          return apiRender.renderError(res, commonError.UNAUTHORIZED_ERROR('用户名与密码不匹配'));
        }

        const userObj = { teacherId: userItem.id };
        return jwtUtil.sign(userObj, systemConfig.jwt_one.secretKey, systemConfig.jwt_one.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 *微信登录授权
 *
 * @param req
 * @param res
 */
pub.authWechatLogin = (req, res) => {
  schemaValidator.validatePromise(wechatSchema.wechatAuthBodySchema, req.body)
      .then((authBody) => {
        return wechatAuth.requestUserItemByAuthCode(
            systemConfig.WECHAT_ONE_CONFIG.APP_ID,
            systemConfig.WECHAT_ONE_CONFIG.SECRET,
            authBody.code,
            enumModel.userBindTypeEnum.WECHAT_APP_ONE.key
        );
      })
      .then((userItem) => {
        // 签名， token
        const teacherObj = { teacherId: userItem.id };
        return jwtUtil.sign(teacherObj, systemConfig.jwt_one.secretKey, systemConfig.jwt_one.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新用户授权token
 *
 * @param req
 * @param res
 */
pub.refreshAuthToken = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((tokenBody) => {
        debug(tokenBody);

        const teacherObj = { teacherId: req.__CURRENT_USER.id };
        return jwtUtil.sign(teacherObj, systemConfig.jwt_one.secretKey, systemConfig.jwt_one.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(req.__CURRENT_USER));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 删除用户token
 * todo 现在直接返回sccess，待完成
 * @param req
 * @param res
 */
pub.deleteToken = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
