'use strict';

const _ = require('lodash');
const Joi = require('joi');

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');

let pub = {};

/**
 * 用户登录Body Schema
 * @type {*}
 */
pub.adminLoginBodySchema = Joi.object().keys({
  phoneNumber: Joi.string().trim().required(),
  password: Joi.string().trim().required()
});

/**
 * 新建管理员Body Schema
 * @type {*}
 */
pub.createAdminBodySchema = Joi.object().keys({
  phoneNumber: Joi.string().trim().max(16).required(),
  password: Joi.string().trim().min(6).required(),
  name: Joi.string().trim().max(32).required(),
  role: Joi.string().valid(_.keys(enumModel.systemerTypeEnum)).required(),
  headImgUrl: Joi.string().uri().max(256),
});

/**
 * 设置管理员权限Body Schema
 *
 * @type {*}
 */
pub.adminClazzPermissionSchema = Joi.object().keys({
  clazzIds: Joi.array().unique().items(Joi.string().regex(/^[a-f\d]{24}$/i)).required()
});

/**
 * 查询管理员列表Schema
 */
pub.queryAdminListSchema = pagedBaseSchema;

module.exports = pub;
