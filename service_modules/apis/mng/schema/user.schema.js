'use strict';

const Joi = require('joi');
const pagedBaseSchema = require("./paged.base.schema");
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

/**
 * 用户分页查询
 */
pub.pagedQuerySchema = pagedBaseSchema.keys({
  keyword: Joi.string(),
});

module.exports = pub;
