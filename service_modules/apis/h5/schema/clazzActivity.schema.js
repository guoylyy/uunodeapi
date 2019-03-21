'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));
const _ = require('lodash');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 查询活动query schema
 */
pub.queryActivitiesSchema = Joi.object().keys({
  type: Joi.string().valid(_.keys(enumModel.activityTypeEnum)).required()
});

/**
 * 创建班级活动账户Body内容
 */
pub.createActivityAccountBodySchema = Joi.object().keys({
  gender: Joi.string().valid([enumModel.genderEnum['1'].key, enumModel.genderEnum['2'].key]).required(),
  partnerInfo: Joi.object().keys({
    gender: Joi.string().valid(_.keys(enumModel.genderEnum)).required(),
  }).required(),
  introduction: Joi.string().allow('').max(128)
});

module.exports = pub;
