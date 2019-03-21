'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');

const systemConfig = require('../../../../config/config');

let pub = {};

/**
 * 查询退款列表query schema
 * @type {*}
 */
pub.withdrawQuerySchema = pagedBaseSchema
    .keys({
      keyword: Joi.string().empty(''),
      searchType: Joi.string().valid(_.keys(enumModel.userSearchTypeEnum)).empty(''),
      status: Joi.string().valid(_.keys(enumModel.withdrawStatusEnum)).empty(''),
      applyDate: Joi.date().format('YYYY-MM-DD')
    })
    .and('searchType', 'keyword');

/**
 * 更新用户退款Body schema
 */
pub.updateWithdrawBodySchema = Joi.object().keys({
  status: Joi.string()
      .valid(
          [enumModel.withdrawStatusEnum.AGREED.key, enumModel.withdrawStatusEnum.REJECTED.key]
      ).required(),
  withdrawType: Joi.string().valid(_.keys(enumModel.withdrawTypeEnum))
      .when("status", {
        is: enumModel.withdrawStatusEnum.AGREED.key,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
  userPayId: commonSchema.mysqlIdSchema.empty('')
      .when('withdrawType', {
        is: enumModel.withdrawTypeEnum.WECHAT_WITHDRAW.key,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
  refundAccount: Joi.string().valid(_.keys(enumModel.refundAccountEnum)).empty('')
      .when('withdrawType', {
        is: enumModel.withdrawTypeEnum.WECHAT_WITHDRAW.key,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
  verifiedRemark: Joi.string().allow('').max(64),
  verifiedMoney: Joi.number().integer().min(0).max(systemConfig.WECHAT_APP_WITHDRAW_CONFIG.maxWithdrawMoney).required(),
  isNotify: Joi.boolean().default(false)
});

/**
 * 班级周退款query schema
 */
pub.clazzWeeklyWithdrawSchema = Joi.object().keys({
  startDate: Joi.date().format('YYYY-MM-DD').max(Joi.ref('endDate')).required(),
  endDate: Joi.date().format('YYYY-MM-DD').max('now').required(),
  checkinPrice: Joi.number().integer().min(0).max(10000).required(),
  maxCheckinTimes: Joi.number().integer().min(0).max(31).required()
});

pub.clazzWeeklyWithdrawListQuerySchema = pagedBaseSchema;

module.exports = pub;
