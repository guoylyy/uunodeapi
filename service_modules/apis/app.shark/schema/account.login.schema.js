'use strict';
/***********************************************************************************************************************
 * shark app api schema
 ***********************************************************************************************************************/

const Joi = require('joi');

const pub = {};

/**
 * 微信授权body schema
 * @type {*}
 */
pub.wechatAuthBodySchema = Joi.object().keys({
  code: Joi.string().required()
});

/**
 * 手机号码登录body schema
 */
pub.phoneNumberAuthBodySchema = Joi.object().keys({
  phoneNumber: Joi.string().min(11).required(),
  password: Joi.string().required()
});

module.exports = pub;
