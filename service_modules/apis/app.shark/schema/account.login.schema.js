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

/**
 * 发送验证码 body schema
 */
pub.sendCodeBodyAuth = Joi.object().keys({
  phoneNumber: Joi.string().min(11).required()
});


/**
 * 验证码登录 body schema
 */
pub.smsAuthBody = Joi.object().keys({
  phoneNumber: Joi.string().min(11).required(),
  code: Joi.string().alphanum().length(6).required()
});

module.exports = pub;
