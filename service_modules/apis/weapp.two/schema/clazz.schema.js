'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));
const commonSchema = require('../../common.schema');
const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 查询班级陌生人query schema
 */
pub.queryClazzEasemobStrangerUserBindListQuerySchema = Joi.object().keys({
  keyword: Joi.string().allow('').empty('')
});

/**
 * 查询课程列表query schema
 * @type {*}
 */
pub.clazzQuerySchema = Joi.object().keys({
  status: Joi.string().trim().required().valid(_.keys(enumModel.clazzStatusEnum)),
  isCheckinable: Joi.boolean().empty('').default(false)
});

/**
 * 创建打卡body schema
 * @type {*}
 */
pub.createCheckinBodySchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date'),
  fileIds: Joi.array().items(commonSchema.mongoIdSchema.required()).required()
});

module.exports = pub;
