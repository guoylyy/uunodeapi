'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');

let pub = {};

/**
 * 查询优惠券列表query schema
 * @type {*}
 */
pub.couponQuerySchema = pagedBaseSchema
    .keys({
      keyword: Joi.string().empty(''),
      searchType: Joi.string().valid(_.keys(enumModel.userSearchTypeEnum)).empty(''),
      status: Joi.string().valid(_.keys(enumModel.couponStatusEnum)).empty('')
    })
    .and('searchType', 'keyword');

/**
 * 更新优惠券优币body schema
 * @type {*}
 */
pub.updateCouponBodySchema = Joi.object().keys({
  money: Joi.number().integer().positive(),
  status: Joi.string().valid(_.keys(enumModel.couponStatusEnum)).empty(''),
  expireDate: Joi.date().format('YYYY-MM-DD'),
  remark: Joi.string().max(64).allow(''),
  isNotify: Joi.boolean().default(false)
});

module.exports = pub;
