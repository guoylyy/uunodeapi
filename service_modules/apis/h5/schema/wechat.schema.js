'use strict';

const _ = require('lodash');
const Joi = require('joi');

let pub = {};

/**
 * 微信
 * @type {*}
 */
pub.wechatAuthQuerySchema = Joi.object().keys({
  url: Joi.string().uri({ relativeOnly: true }).default('/')
});

/**
 * 微信授权body schema
 * @type {*}
 */
pub.wechatAuthBodySchema = Joi.object().keys({
  code: Joi.string().required()
});

/**
 *
 * @type {*}
 */
pub.wechatJsSdkSignQuerySchema = Joi.object().keys({
  url: Joi.string().uri({ relativeOnly: true }).required()
});

module.exports = pub;
