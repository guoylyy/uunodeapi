'use strict';

const Joi = require('joi');

let pub = {};

/**
 * 微信授权body schema
 * @type {*}
 */
pub.wechatAuthBodySchema = Joi.object().keys({
  code: Joi.string().required()
});

module.exports = pub;
