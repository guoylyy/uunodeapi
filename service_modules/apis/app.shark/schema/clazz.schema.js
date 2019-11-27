'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const commonSchema = require('../../common.schema');
const pagedSchema = require('./paged.base.schema');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 查询课程列表query schema
 * @type {*}
 */
pub.clazzQuerySchema = Joi.object().keys({
  status: Joi.string().trim().required().valid(_.keys(enumModel.clazzStatusEnum)),
  isCheckinable: Joi.boolean().empty('').default(false)
});

/*
 * 用户课程账单Body Schema
 *
 * @type {*}
 */
pub.clazzPaymentBodySchema = Joi.object().keys({
  money: Joi.number().precision(2).min(0).required(),
  priceItemName: Joi.string().max(32),
  months: Joi.number().integer().min(0).required(),
  coupon: Joi.object().required().keys({
    id: Joi.number().empty('').integer().min(0).default(null),
    selected: Joi.boolean().required()
  }),
  coin: Joi.object().required().keys({
    coin: Joi.number().empty('').integer().min(0).default(0),
    selected: Joi.boolean().required()
  }),
  payway: Joi.string().valid([enumModel.payWayEnum.alipay_uband_app.key, enumModel.payWayEnum.wechat_uband_app.key]).required()
});


/**
 * 获取任务详情query schema
 *
 * @type {*}
 */
pub.clazzTaskQuerySchema = Joi.object().keys({
  postId: commonSchema.mysqlIdSchema,
});


pub.clazzCheckinsSchema = pagedSchema;

pub.checkinTrendPagedQuerySchema = pagedSchema;

pub.clazzLuckyCheckinQuerySchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date')
});

module.exports = pub;
