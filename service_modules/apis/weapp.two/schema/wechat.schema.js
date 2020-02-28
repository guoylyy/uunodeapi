'use strict';

const Joi = require('joi');

let pub = {};

/**
 * 微信小程序授权body schema
 *
 * @type {*}
 */
pub.weappAuthBodySchema = Joi.object().keys({
  code: Joi.string().required(),
  encryptedData: Joi.string().required(),
  iv: Joi.string().required()
});

/**
 * 用户登录Body Schema
 * @type {*}
 */
pub.userLoginBodySchema = Joi.object().keys({
  username: Joi.string().trim().required(),
  password: Joi.string().trim()
});

module.exports = pub;
