'use strict';

const Joi = require('joi');

let pub = {};

/**
 * 创建打卡文件body schema
 * @type {*}
 */
pub.createCheckinFileBodySchema = Joi.object().keys({
  url: Joi.string().uri().required()
});

module.exports = pub;
