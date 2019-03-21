'use strict';

const Joi = require('joi');

const pub = {};

/**
 * 打卡评分
 */
pub.userCheckinReviewScoreSchema = Joi.object().keys({
  score: Joi.number().integer().min(0).max(1000).required(),
  remark: Joi.string().max(256).required()
});

/**
 * 班级用户评分更改信息
 */
pub.clazzUserScoreUpdateSchema = Joi.object().keys({
  score: Joi.number().integer().min(0).max(1000).required(),
  remark: Joi.string().max(256).required()
});

module.exports = pub;
