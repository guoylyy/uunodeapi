'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');

let pub = {};

/**
 * 新建公开课schema
 *
 * @type {*}
 */
pub.openCouseCreateSchema = Joi.object().keys({
  name: Joi.string().max(32).allow('').required(),
  author: Joi.string().max(32).required(),
  logo: Joi.string().uri().required(),
  banner: Joi.string().uri().required(),
  status: Joi.string().valid(_.keys(enumModel.openCourseStatusEnum)).required(),
  description: Joi.string().max(64).allow(''),
  openDate: Joi.date().format('YYYY-MM-DD HH:mm:ss').required(),
  isSticked: Joi.boolean().default(false).required(),
  tagList: Joi.array().items(Joi.string().max(16)),
  teacherUserIdList: Joi.array().items(Joi.number().integer().positive())
});

module.exports = pub;
