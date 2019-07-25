'use strict';

const _ = require('lodash');
const Joi = require('joi');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 微信授权body schema
 * @type {*}
 */
pub.appVersionSchema = Joi.object().keys({
  platform: Joi.string().valid(_.keys(enumModel.appTypeEnum)).required()
});

/**
 * 查询单词的 schema
 */
pub.wordQuerySchema = Joi.object().keys({
  word: Joi.string().required(),
  brief: Joi.number().integer().positive().default(1)
});


module.exports = pub;
