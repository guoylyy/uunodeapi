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
  status: Joi.string()
});

pub.createTaskSchema = Joi.object().keys({
  title: Joi.string().required(),
  sourceDate: Joi.date().required(),
  pic: commonSchema.mongoIdSchema.required(),
  bigPic: commonSchema.mongoIdSchema.required(),
  duration: Joi.number().integer().positive().required(),
  theme: Joi.string().valid(_.keys(enumModel.taskThemeEnum)).required(),
  language: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)).required(),
  oppoLanguage: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)).required(),
  type: Joi.string().valid(_.keys(enumModel.taskTypeEnum)).required(),
  level: Joi.string().valid(_.keys(enumModel.taskLevelEnum)).required(),
  description: Joi.string().required(),
  srcAudio: commonSchema.mongoIdSchema,
  oppoAudio: commonSchema.mongoIdSchema,
  srcVideo: commonSchema.mongoIdSchema,
  oppoVideo: commonSchema.mongoIdSchema,
  pausePoints: Joi.array(),
  terminology: Joi.string(),
  attachText: Joi.string()
});





pub.checkinSchema = Joi.object().keys({
  attach: commonSchema.mongoIdSchema.required(),
  title: Joi.string().required(),
  practiceMode: Joi.string().valid(_.keys(enumModel.miniKYPracticeModeEnum)).required(),
  practiceTime: Joi.number().integer().positive().required(),
  audioDuration: Joi.number().integer().positive().required()
});

pub.checkinPagedSchema = pagedBaseSchema.keys({
  practiceMode: Joi.string().valid(_.keys(enumModel.miniKYPracticeModeEnum))
});

pub.updateCheckinSchema = Joi.object().keys({
  title: Joi.string().required(),
});

module.exports = pub;
