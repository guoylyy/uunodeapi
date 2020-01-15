"use strict";

const _ = require("lodash");
const Joi = require("joi").extend(require("joi-date-extensions"));
const commonSchema = require("../../common.schema");
const enumModel = require("../../../services/model/enum");

const pub = {};

const pagedBaseSchema = require("./paged.base.schema");

pub.pagedSchema = pagedBaseSchema.keys({
  title: Joi.string(),
  type: Joi.string().valid(_.keys(enumModel.lessonTypeEnum)),
  status: Joi.string().valid(_.keys(enumModel.lessonStatusEnum))
});

pub.createLessonSchema = Joi.object().keys({
  title: Joi.string().required(),
  description: Joi.string().required(),
  image: Joi.string().required(),
  linkType: Joi.string().valid(_.keys(enumModel.lessonLinkTypeEnum)).required(),
  types: Joi.array().items(Joi.string().valid(_.keys(enumModel.lessonTypeEnum))).required(),
  linkContent: Joi.string(),
  author: Joi.string(),
  linkUrl: Joi.string(),
  tags: Joi.array().items(Joi.string().max(4)),
  status: Joi.string().valid(_.keys(enumModel.lessonStatusEnum)).required()
});

module.exports = pub;
