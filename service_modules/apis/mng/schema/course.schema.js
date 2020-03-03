"use strict";

/**
 * Created at Mar 3, 2020 18:41 by HuPeng
 * Defined Course Validation Schema
 */
const _ = require("lodash");
const Joi = require("joi").extend(require("joi-date-extensions"));
const commonSchema = require("../../common.schema");
const enumModel = require("../../../services/model/enum");

const pub = {};

const pagedBaseSchema = require("./paged.base.schema");

pub.querySchema = pagedBaseSchema.keys({
  clazzTeacherId: commonSchema.mongoIdSchema,
  status: Joi.string().valid(_.keys(enumModel.courseStatusEnum)),
  title: Joi.string(),
});

pub.updateSchema = Joi.object().keys({
  id: commonSchema.mongoIdSchema.required(),
  status: Joi.string().valid(_.keys(enumModel.courseStatusEnum)).required(),
});

pub.createSchema = Joi.object().keys({
  clazzTeacherId: commonSchema.mongoIdSchema.required(),
  status: Joi.string().valid(_.keys(enumModel.courseStatusEnum)).required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  courseHours: Joi.number().integer().positive().min(1).required(),
  bannerUrl: Joi.string().required(),
  price: Joi.number().integer().positive().min(0).required(),
})

module.exports = pub;
