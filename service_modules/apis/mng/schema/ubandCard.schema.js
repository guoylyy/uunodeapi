'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const commonSchema = require('../../common.schema');

let pub = {};

/**
 * 新建优惠券优币body schema
 * @type {*}
 */
pub.createUserCardBodySchema = Joi.object().keys({
  expireDate: Joi.date().format('YYYY-MM-DD'),
  remark: Joi.string().max(64).allow(''),
  title: Joi.string().max(64),
  type: Joi.string().max(64),
  scope: Joi.string().max(64),
  isNotify: Joi.boolean().default(false)
});

module.exports = pub;
