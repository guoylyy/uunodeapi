'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));

let pub = {};

/**
 * 用户登录Body Schema
 * @type {*}
 */
pub.userLoginBodySchema = Joi.object().keys({
  username: Joi.string().trim().required(),
  password: Joi.string().trim()
});

module.exports = pub;
