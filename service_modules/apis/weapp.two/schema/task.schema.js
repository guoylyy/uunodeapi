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
  practiceTime: Joi.number().integer().positive().required(),
  wordCount: Joi.number().integer().positive().required(),
  translationText: Joi.string().required()
});

pub.checkinPagedSchema = pagedBaseSchema.keys({
  practiceMode: Joi.string().valid(_.keys(enumModel.miniKYPracticeModeEnum))
});

pub.updateCheckinSchema = Joi.object().keys({
  translationText: Joi.string().required(),
});

module.exports = pub;
