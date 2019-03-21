'use strict';

const Joi = require('joi');

let pub = {};

/**
 * mogonId 正则匹配
 * @type {*}
 */
pub.mongoIdSchema = Joi.string().regex(/^[a-f\d]{24}$/i);

/**
 * mysql Id
 */
pub.mysqlIdSchema = Joi.number().positive();

/**
 * 空对象schema
 * @type {*}
 */
pub.emptySchema = Joi.object().keys({});

module.exports = pub;
