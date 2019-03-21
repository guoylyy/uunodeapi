'use strict';

const Joi = require('joi');

const pub = {};

/**
 * 管理员登录Body Schema
 * @type {*}
 */
pub.adminLoginBodySchema = Joi.object().keys({
  phoneNumber: Joi.string().trim().required(),
  password: Joi.string().trim().required()
});

/**
 * 管理员更新密码body schema
 * @type {*}
 */
pub.updateAdminPasswordBodySchema = Joi.object().keys({
  oldPassword: Joi.string().required(),
  password: Joi.string().min(8).required()
});

module.exports = pub;
