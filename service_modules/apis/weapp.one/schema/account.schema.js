'use strict';

/**
 * 用户相关 api schema
 */
const Joi = require('joi').extend(require('joi-date-extensions'));
const _ = require('lodash');

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
 * 更新用户基本信息body schema
 */
pub.userInfoUpdateSchema = Joi.object().keys({
  sex: Joi.string().valid(_.keys(enumModel.genderEnum))
});

/**
 * 更新用户学校信息的body schema
 */
pub.userUpdateSchoolSchema = Joi.object().keys({
  school: Joi.string().max(64).required()
});

/**
 * 更新用户证书信息的body schema
 */
pub.userUpdateCertificationSchema = Joi.object().keys({
  certifications : Joi.array().items(Joi.string().max(64).valid(_.keys(enumModel.userCertificationEnum)))
});

/**
 * 更新用户私有信息body schema
 */
pub.userPrivacyUpdateSchema = Joi.object().keys({
  realName: Joi.string().max(32),
  alipay: Joi.string().trim().max(32)
});

pub.redeemUbandCoinSchema = Joi.object().keys({
  redeem: Joi.string()
});

pub.ubandCoinSchema = Joi.object().keys({
  receipt: Joi.string().required()
});

pub.useUbandCoinSchema = Joi.object().keys({
  clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
  priceItemName: Joi.string().max(32).required(),
  months: Joi.number().integer().min(0).required(),
  coupon: Joi.object().required().keys({
    id: Joi.number().empty('').integer().min(0).default(null),
    selected: Joi.boolean().required()
  }),
  ubandCoin: Joi.object().required().keys({
    coin: Joi.number().integer().min(0).default(0),
    selected: Joi.boolean().required()
  })
});


/**
 * 用户查询卡片 query schema
 */
pub.cardQuerySchema = Joi.object().keys({
  status: Joi.string()
});

/**
 * 查询用户配置信息列表
 */
pub.userConfigUpdateSchema = Joi.object().keys({
  key : Joi.string().required(),
  value : Joi.string().required()
});

module.exports = pub;
