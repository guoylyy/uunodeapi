'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');

const pub = {};

/**
 * 新建班级推送body schema
 */
pub.createClazzNotificationBodySchema = Joi.object().keys({
  status: Joi.string().valid(_.keys(enumModel.clazzJoinStatusEnum)).required(),
  title: Joi.string().max(128).required(),
  remark: Joi.string().max(256).required(),
  url: Joi.string().uri().required()
});

pub.clazzNotificationQuerySchema = pagedBaseSchema;

module.exports = pub;
