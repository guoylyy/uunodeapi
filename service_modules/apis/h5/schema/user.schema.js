'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 用户登录Body Schema
 * @type {*}
 */
pub.userLoginBodySchema = Joi.object().keys({
  username: Joi.string().trim().required(),
  password: Joi.string().trim()
});

/**
 * 用户更新私有信息Body Schema
 *
 * @type {*}
 */
pub.updateUserPrivacyBodySchema = Joi.object().keys({
  phoneNumber: Joi.string().trim().regex(/^1[34578]\d{9}$/),
  realName: Joi.string().max(32),
  wechat: Joi.string().trim().max(32),
  alipay: Joi.string().trim().max(32),
  timezone: Joi.string().trim().valid(_.keys(enumModel.timezoneEnum))
});

/**
 * 用户初始化设置密码body schema
 * @type {*}
 */
pub.initUserPasswordBodySchema = Joi.object().keys({
  password: Joi.string().min(8).required()
});

/**
 * 用户更新密码body schema
 * @type {*}
 */
pub.updateUserPasswordBodySchema = Joi.object().keys({
  oldPassword: Joi.string().required(),
  password: Joi.string().min(8).required()
});

/**
 * 查询学分query schema
 * @type {*}
 */
pub.scoresQuerySchema = Joi.object().keys({
  status: Joi.string().required().valid([enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.CLOSE.key])
});

/**
 * 用户提现body schema
 * @type {*}
 */
pub.userWithdrawBodySchema = Joi.object().keys({
  coins: Joi.number().integer().required().min(20).max(500),
  username: Joi.string().required().max(64),
  payway: Joi.string().required().valid(_.keys(enumModel.payWayEnum)).default(enumModel.payWayEnum.wechat.key),
  remark: Joi.string().max(200).empty('')
});

/**
 * 更新用户基本信息body schema
 */
pub.updateUserBaseInfoBodySchema = Joi.object().keys({
  birthday: Joi.date().format('YYYY-MM-DD').max('now')
});

/**
 * 用户护照body schema
 */
pub.createUserPassportBodySchema = Joi.object().keys({
  sex: Joi.string().valid(_.keys(enumModel.genderEnum)).required(),
  birthday: Joi.date().format('YYYY-MM-DD').required(),
  city: Joi.string().required(),
  userEnglishLevel: Joi.string().valid(_.keys(enumModel.userEnglishLevelEnum)).required(),
  userSelfIdentity: Joi.string().valid(_.keys(enumModel.userSelfIdentityEnum)).required(),
  preferLearningMode: Joi.string().valid(_.keys(enumModel.learningModeEnum)).required()
});

/**
 * 用户排行query schema
 */
pub.rankQuerySchema = Joi.object().keys({
  type: Joi.string().valid(_.keys(enumModel.userRankTypeEnum)).required()
});

/**
 * 用户查询优惠券 query schema
 */
pub.couponQuerySchema = Joi.object().keys({
  status: Joi.string()
});

/**
 * 用户查询卡片 query schema
 */
pub.cardQuerySchema = Joi.object().keys({
  status: Joi.string()
});

/**
 * 用户目标设置 schema
 */
pub.targetUpdateSchema = Joi.object().keys({
  target: Joi.string().required()
});

module.exports = pub;
