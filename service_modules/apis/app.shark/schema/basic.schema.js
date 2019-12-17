'use strict';
/***********************************************************************************************************************
 * shark app api schema
 ***********************************************************************************************************************/
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
 * 系统配置类型 Schema
 */
pub.fetchSysconfigSchema = Joi.object().keys({
  sysconfigType: Joi.string().required(),
  key: Joi.string().required()
});

module.exports = pub;
