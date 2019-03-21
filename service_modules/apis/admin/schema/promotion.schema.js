'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const pagedSchema = require('../../app.shark/schema/paged.base.schema');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 推广收益查询Schema
 */
pub.promotionIncomeQuerySchema = pagedSchema.keys({
  status: Joi.string().valid(_.keys(enumModel.promotionIncomeStatusEnum)).allow(''),
  studentNumber: Joi.string().allow('')
});

module.exports = pub;
