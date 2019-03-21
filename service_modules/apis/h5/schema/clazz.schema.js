'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));
const _ = require('lodash');

const commonSchema = require('../../common.schema');
const pagedBaseSchema = require('./paged.base.schema');

const enumModel = require('../../../services/model/enum');

let pub = {};

/**
 * 查询课程列表query schema
 * @type {*}
 */
pub.clazzQuerySchema = Joi.object().keys({
  status: Joi.string().trim().required().valid(_.keys(enumModel.clazzStatusEnum)),
  isCheckinable: Joi.boolean().empty('').default(false)
});

/**
 * 更新打卡body schema
 * @type {*}
 */
pub.updateCheckinBodySchema = Joi.object().keys({
  fileIds: Joi.array().items(commonSchema.mongoIdSchema.required()).required()
});

/**
 * 查询打卡情况
 *
 * @type {*}
 */
pub.queryCheckinStatusSchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date')
});

/**
 * 创建打卡body schema
 * @type {*}
 */
pub.createCheckinBodySchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date'),
  fileIds: Joi.array().items(commonSchema.mongoIdSchema.required()).required()
});

/**
 * 创建任务回复body schema
 * @type {*}
 */
pub.createTaskReplyBodySchema = Joi.object().keys({
  content: Joi.string().trim().required().max(256)
});

/**
 * 创建分享记录 body schema
 */
pub.createShareLogBodySchema = Joi.object().keys({
  name: Joi.string().trim().required().max(256),
  userId: commonSchema.mysqlIdSchema,
  isPush: Joi.boolean().default(false)
});

/**
 * 查询反馈列表query schema
 */
pub.feedbackQuerySchema = pagedBaseSchema.keys({
  isWaitingOnly: Joi.boolean().default(false),
  keyWord: Joi.string().max(16).empty('')
});

/**
 * 查询课程笃师一对一反馈素材query schema
 */
pub.feedbackMaterialQuerySchema = pagedBaseSchema;

/**
 * 查询笃师一对一反馈消息列表query schema
 */
pub.feedbackRepliesQuerySchema = Joi.object().keys({
  pageSize: Joi.number().integer().positive().default(10),
  endDate: Joi.date().format('YYYY-MM-DDTHH:mm:ss.SSSZ').max('now').empty(''),
  startDate: Joi.date().format('YYYY-MM-DDTHH:mm:ss.SSSZ').max('now'),
});

/**
 * 新建笃师一对一回复body schema
 * @type {*}
 */
pub.feedbackReplyBodySchema = Joi.object().keys({
  replyType: Joi.string().valid(_.keys(enumModel.clazzFeedbackReplyTypeEnum)).required(),
  mediaId: Joi.string().trim(),
  content: Joi.string().max(1024),
  materialId: Joi.string().regex(/^[a-f\d]{24}$/i),
  attachId: Joi.string().regex(/^[a-f\d]{24}$/i),
}).xor('mediaId', 'content', 'materialId', 'attachId');

/**
 * 用户课程账单Body Schema
 *
 * @type {*}
 */
pub.clazzPaymentBodySchema = Joi.object().keys({
  coupon: Joi.object().required().keys({
    id: Joi.number().empty('').positive().default(null),
    selected: Joi.boolean().required()
  }),
  coin: Joi.object().required().keys({
    coin: Joi.number().empty('').integer().min(0).default(0),
    selected: Joi.boolean().required()
  }),
  money: Joi.number().precision(2).min(0).required(),
  months: Joi.number().integer().min(0).required(),
  priceItemName: Joi.string().max(32).required(),
  promotionCode: Joi.string().max(16)
});

/**
 * 获取任务详情query schema
 *
 * @type {*}
 */
pub.fetchClazzTaskQuerySchema = Joi.object().keys({
  postId: commonSchema.mysqlIdSchema,
  userId: commonSchema.mysqlIdSchema
});

/**
 * 分页获取课程排行榜Query schema
 */
pub.clazzRankQuerySchema = pagedBaseSchema;

/**
 * 学员退班记路Schema
 */
pub.clazzExitSchema = Joi.object().keys({
  clazzId: commonSchema.mongoIdSchema.required(),
  reason: Joi.string().trim().max(255).required()
});

module.exports = pub;
