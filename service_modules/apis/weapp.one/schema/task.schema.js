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
  oppoLanguage: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)),
  gtDuration: Joi.number().integer().positive(),
  ltDuration: Joi.number().integer().positive()
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

module.exports = pub;
