'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));
const _ = require('lodash');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 创建班级活动账户Body内容
 */
pub.createActivityRoomBodySchema = Joi.object().keys({
  algorithm: Joi.string().valid(['random', 'normal']).required(),
  isSave: Joi.boolean().required()
});

/**
 * 重新匹配body schema
 */
pub.rematchActivityRoomBodySchema = Joi.object().keys({
  demandedIds: Joi.array().items(Joi.number().positive().integer()).default([]),
  isSave: Joi.boolean().required()
});

module.exports = pub;
