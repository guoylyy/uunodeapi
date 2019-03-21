'use strict';
/***********************************************************************************************************************
 * shark app api schema
 ***********************************************************************************************************************/

const Joi = require('joi');

const pub = {};

/**
 * 发送验证码 body schema
 */
pub.sendCodeBodyAuth = Joi.object().keys({
  phoneNumber: Joi.string().min(11).required()
});

/**
 * 校验验证码 body schema
 */
pub.checkCodeBodyAuth = Joi.object().keys({
  phoneNumber: Joi.string().min(11).required(),
  code: Joi.string().alphanum().length(6).required()
});

/**
 * 设置密码body schema
 */
pub.setPasswordBody = Joi.object().keys({
  phoneNumber: Joi.string().min(11).required(),
  code: Joi.string().alphanum().length(6).required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
});

/**
 * 微信授权body schema
 * @type {*}
 */
pub.wechatAuthBodySchema = Joi.object().keys({
  code: Joi.string().required()
});

module.exports = pub;
