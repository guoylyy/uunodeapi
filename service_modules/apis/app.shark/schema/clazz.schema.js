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
  isCheckinable: Joi.boolean().empty('').default(false),
  isHot: Joi.boolean().empty('').default(null)
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


pub.clazzCheckinsSchema = pagedSchema.keys({
  isFeatured: Joi.boolean(),
  hasReviews: Joi.boolean(),
  taskId: commonSchema.mongoIdSchema,
});

pub.checkinTrendPagedQuerySchema = pagedSchema;

pub.clazzLuckyCheckinQuerySchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date')
});

/**
 * 学员退班记录Schema
 */
pub.clazzExitSchema = Joi.object().keys({
  clazzId: commonSchema.mongoIdSchema.required(),
  reason: Joi.string().trim().max(255).required()
});

/**
 * 学员退班查询
 */
pub.clazzExitQuerySchema = Joi.object().keys({
  status: Joi.string().trim().max(255).required()
});

/**
 * 教师点评
 */
pub.checkinReviewSchema = Joi.object().keys({
  audioId: commonSchema.mongoIdSchema,
  videoId: commonSchema.mongoIdSchema,
  text: Joi.string().trim().max(255),
})
.or('audioId', 'videoId', 'text');

pub.updateFeatured = Joi.object().keys({
  isFeatured: Joi.boolean().required()
})

module.exports = pub;
