'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));
const moment = require('moment');

const pageBasedSchema = require('./paged.base.schema');

const enumModel = require('../../../services/model/enum');

let pub = {};

/**
 * 查询学员列表query schema
 * @type {*}
 */
pub.userQuerySchema = pageBasedSchema
    .keys({
      keyword: Joi.string().empty(''),
      searchType: Joi.string().valid(_.keys(enumModel.userSearchTypeEnum)).empty(''),
      status: Joi.string().valid(_.keys(enumModel.clazzJoinStatusEnum)).empty('')
    })
    .and('searchType', 'keyword');

/**
 * 新建优币body Schema
 * @type {*}
 */
pub.createCoinBodySchema = Joi.object().keys({
  coinChange: Joi.number().integer().required(),
  title: Joi.string().max(32).required(),
  bizType: Joi.string().valid(_.keys(enumModel.coinBizTypeEnum)).required(),
  remark: Joi.string().max(64).empty(''),
  isNotify: Joi.boolean().default(false)
});

/**
 * 新建优惠券优币body schema
 * @type {*}
 */
pub.createCouponBodySchema = Joi.object().keys({
  money: Joi.number().integer().positive().required(),
  expireDate: Joi.date().format('YYYY-MM-DD').min('now').default(() => moment().add(3, 'months').toDate(), 'default expire date'),
  remark: Joi.string().max(64).empty(''),
  isNotify: Joi.boolean().default(false)
});

/**
 * 查询用户支付记录query schema
 */
pub.userPayQuerySchema = Joi.object().keys({
  status: Joi.string().valid(['', enumModel.payStatusEnum.PAY_SUCCESS.key]).empty(''),
  withClazz: Joi.boolean().default(false)
});

/**
 * 同步学员列表 schema
 * @type {*}
 */
pub.syncUserSchema = Joi.object()
    .keys({
      keyword: Joi.string().required(),
      searchType: Joi.string().valid(_.keys(enumModel.userSearchTypeEnum)).required(),
      status: Joi.string().valid(_.keys(enumModel.clazzJoinStatusEnum)).empty('')
    })
    .and('searchType', 'keyword');

module.exports = pub;
