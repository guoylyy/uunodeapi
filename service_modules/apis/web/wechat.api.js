'use strict';

const debug = require('debug')('controller');
const winston = require('winston');

const apiUtil = require('../util/api.util');
const jwtUtil = require('../util/jwt.util');

const systemConfig = require('../../../config/config');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');

const wechatSchema = require('./schema/wechat.schema');

const wechatAuth = require('../../lib/wechat.auth');

const enumModel = require('../../services/model/enum');

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
        let url = wechatAuth.getWechatQrConnectUrl(systemConfig.WECHAT_WEB_CONFIG.APP_ID, systemConfig.WEB_BASE_URL + authBody.url);
        debug(url);

        return apiRender.renderBaseResult(res, url);
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
  return schemaValidator.validatePromise(wechatSchema.wechatAuthBodySchema, req.body)
      .then((authBody) => {
        return wechatAuth.requestUserItemByAuthCode(
            systemConfig.WECHAT_WEB_CONFIG.APP_ID,
            systemConfig.WECHAT_WEB_CONFIG.SECRET,
            authBody.code,
            enumModel.userBindTypeEnum.WECHAT_WEB.key
        );
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

module.exports = pub;
