'use strict';

const Joi = require('joi');

const pub = {};

/**
 * 管理员登录Body Schema
 * @type {*}
 */
pub.loginBodySchema = Joi.object().keys({
  account: Joi.string().trim().required(),
  password: Joi.string().trim().required()
});


module.exports = pub;
