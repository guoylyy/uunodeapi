"use strict";

const _ = require("lodash");
const Joi = require("joi").extend(require("joi-date-extensions"));
const commonSchema = require("../../common.schema");
const enumModel = require("../../../services/model/enum");

const pub = {};

const pagedBaseSchema = require("./paged.base.schema");

pub.pagedSchema = pagedBaseSchema.keys({
  theme: Joi.string().valid(_.keys(enumModel.taskThemeEnum)),
  language: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)),
  type: Joi.string().valid(_.keys(enumModel.taskTypeEnum)),
  status: Joi.string(),
  title: Joi.string(),
});

pub.createTaskSchema = Joi.object().keys({
  title: Joi.string().max(20).required(),
  sourceDate: Joi.date().required(),
  pic: Joi.string(),
  bigPic: Joi.string(),
  duration: Joi.number().integer().positive().required(),
  theme: Joi.string().valid(_.keys(enumModel.taskThemeEnum)).required(),
  language: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)).required(),
  oppoLanguage: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)).required(),
  type: Joi.string().valid(_.keys(enumModel.taskTypeEnum)).required(),
  level: Joi.string().valid(_.keys(enumModel.taskLevelEnum)).required(),
  description: Joi.string().max(100).required(),
  srcAudio: commonSchema.mongoIdSchema,
  oppoAudio: commonSchema.mongoIdSchema,
  srcVideo: commonSchema.mongoIdSchema,
  oppoVideo: commonSchema.mongoIdSchema,
  pausePoints: Joi.array().items(Joi.number().integer().positive().max(Joi.ref('duration'))).required(),
  oppoPausePoints: Joi.array().items(Joi.number().integer().positive().max(Joi.ref('duration'))).required(),
  terminology: Joi.array().items(Joi.object().keys({word: Joi.string(), notes:Joi.string()})),
  attachText: Joi.string().required(),
  author: Joi.string().max(20),
  status: Joi.string().valid(_.keys(enumModel.taskStatusEnum)).required(),
})
.with('srcVideo', 'oppoVideo')
.with('srcAudio', 'oppoAudio');

pub.pushTaskSchema = Joi.object().keys({
  pushAt: Joi.date().required(),
});

module.exports = pub;
