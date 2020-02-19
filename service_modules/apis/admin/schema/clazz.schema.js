'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');

let pub = {};

/**
 * 查询课程列表query schema
 * @type {*}
 */
pub.clazzQuerySchema = pagedBaseSchema.keys({
  status: Joi.string().valid(_.keys(enumModel.clazzStatusEnum)).empty(''),
  name: Joi.string().max(32).allow('')
});

pub.clazzQueryAllSchema = Joi.object({
  status: Joi.string().empty('').valid(_.keys(enumModel.clazzStatusEnum))
});

/**
 * 创建班级body schema
 */
pub.createClazzBodySchema = Joi.object().keys({
  name: Joi.string().max(32).allow('').required(),
  clazzType: Joi.string().valid(_.keys(enumModel.clazzTypeEnum)).required(),
  status: Joi.string().valid(_.keys(enumModel.clazzStatusEnum)).required(),
  author: Joi.string().max(32).required(),
  openDate: Joi.date().format('YYYY-MM-DD').required(),
  startDate: Joi.date().format('YYYY-MM-DD').required(),
  endDate: Joi.date().format('YYYY-MM-DD').required(),
  banner: Joi.string().uri().required(),
  description: Joi.string().max(64).allow(''),
  isShow: Joi.boolean().default(true),
  isHot: Joi.boolean().default(true),
  teacherHead: Joi.string().uri().required(),
  bindTeacherId: commonSchema.mongoIdSchema,
  smallBanner: Joi.string().uri().required()
});

/**
 * 更新班级body schema
 */
pub.updateClazzBodySchema = Joi.object().keys({
  name: Joi.string().max(32).allow(''),
  clazzType: Joi.string().valid(_.keys(enumModel.clazzTypeEnum)),
  status: Joi.string().valid(_.keys(enumModel.clazzStatusEnum)),
  author: Joi.string().max(32),
  openDate: Joi.date().format('YYYY-MM-DD'),
  startDate: Joi.date().format('YYYY-MM-DD'),
  endDate: Joi.date().format('YYYY-MM-DD'),
  banner: Joi.string().uri(),
  description: Joi.string().max(64).allow(''),
  isShow: Joi.boolean().default(true),
  isHot: Joi.boolean().default(true),
  bindTeacherId: commonSchema.mongoIdSchema,
  teacherHead: Joi.string().uri().required(),
  smallBanner: Joi.string().uri().required()
});

/**
 * 更新班级配置body schema
 */
pub.updateClazzConfigurationBodySchema = Joi.object().keys({
  promotionOffer: Joi.object({
    isPromotion: Joi.boolean().default(false),
    promotionIncome: Joi.number().integer().min(0),
    firstOffer: Joi.number().integer().min(0)
  }),
  QALimit: Joi.number().integer().min(0),
  addCheckinLimit: Joi.number().integer().min(0),
  invitationRequire: Joi.number().integer().min(0),
  groupRequire: Joi.number().integer().min(0),
  hasTheOneFeedback: Joi.boolean(),
  feedbackRound: Joi.number().integer().min(0),
  taskCount: Joi.number().integer().min(0),
  endHour: Joi.number().integer().min(0).max(24),
  startHour: Joi.number().integer().min(0).max(24),
  discount: Joi.number().min(0).default(1),
  teacherOpenIds: Joi.array().items(Joi.string().max(32)).unique(),
  totalFee: Joi.number().integer().min(0),
  originFee: Joi.number().integer().min(0),
  priceList: Joi.array().items(Joi.object().keys({
    name: Joi.string().max(32).required(),
    months: Joi.number().integer().min(0).required(),
    totalFee: Joi.number().integer().min(0).required(),
    originFee: Joi.number().integer().min(0).required()
  })).unique('name'),
  strategyLink: Joi.string().allow(''),
  clazzType: Joi.array().items(Joi.string().valid(_.keys(enumModel.clazzJoinTypeEnum)).required()).unique()
});

/**
 * 更新班级简介body schema
 * @type {*}
 */
pub.updateClazzIntroductionBodySchema = Joi.object().keys({
  title: Joi.string().max(32),
  subTitle: Joi.string().allow(''),
  requiredInfo:Joi.array().items(Joi.object().keys({
    type: Joi.string().required(),
    content:Joi.string().required(),
    isDelete:Joi.boolean().default(false),
    id: Joi.string()
  })).unique('type'),
  introduction: Joi.string().allow(''),
  strategy: Joi.string().allow(''),
});

/**
 * 查询学员列表query schema
 */
pub.studentQuerySchema = Joi.object().keys({
  status: Joi.string().valid(_.keys(enumModel.clazzJoinStatusEnum)).required()
});

pub.clazzExitQuerySchema = pagedBaseSchema.keys({
  clazzId: commonSchema.mongoIdSchema.allow(''),
  status: Joi.string().valid(_.keys(enumModel.clazzExitStatusTypeEnum)).allow('')
});

pub.clazzExitSchema = Joi.object().keys({
  status: Joi.string().max(16).valid([enumModel.clazzExitStatusTypeEnum.AGREED.key, enumModel.clazzExitStatusTypeEnum.REJECTED.key]).required(),
  realUserCoins: Joi.number().min(0).required()
      .when(
          'status',
          {
            is: enumModel.clazzExitStatusTypeEnum.REJECTED.key,
            then: Joi.valid(0)
          }
      ),
  remark: Joi.string().max(255).required(),
  isNotify: Joi.boolean().default(false)
});

module.exports = pub;
