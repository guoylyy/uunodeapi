'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));

const commonSchema = require('../../common.schema');

const pub = {};

/**
 * 更新笃师一对一状态body schema
 */
pub.updateFeedbackStatusBodySchema = Joi.object().keys({
  isNotify: Joi.boolean().default(false),
});

/**
 * 学员支付笃师一对一body schema
 */
pub.userPayClazzFeedbackBodySchema = Joi.object().keys({
  feedbackCount: Joi.number().integer().positive().required(),
  money: Joi.number().integer().positive().required(),
  code: Joi.string().required(),
  encryptedData: Joi.string().required(),
  iv: Joi.string().required()
});

module.exports = pub;
