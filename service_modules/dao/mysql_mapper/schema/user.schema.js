'use strict';

/**
 * 定义 user Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let user = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user',

  createSchema: baseSchema.baseCreateSchema.keys({
    name: Joi.string().max(32).required(),
    headImgUrl: Joi.string().allow('').max(256).required(),
    openId: Joi.string().max(32),
    unionid: Joi.string().max(32),

    studentNumber: Joi.string().max(16),
    invitatedBy: Joi.number().integer().positive(),
    saltHashedPassword: Joi.string().max(128),
    sex: Joi.number().valid(0, 1, 2),
    city: Joi.string().max(32).allow(''),
    hasFillInfo: Joi.boolean().default(false),

    address: Joi.string().max(128),
    wechat: Joi.string().max(32),
    alipay: Joi.string().max(32),
    phoneNumber: Joi.string().max(11),
    realName: Joi.string().max(32),
    birthday: Joi.date(),
    timezone: Joi.string().max(32),
    invitations: Joi.string().max(65535),
    target: Joi.string().max(256),

    isSubscribe: Joi.boolean().default(true)
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    name: Joi.string().max(32),
    headImgUrl: Joi.string().max(256),
    openId: Joi.string().max(32),
    unionid: Joi.string().max(32),
    sex: Joi.number().valid(0, 1, 2),
    city: Joi.string().max(32).allow(''),

    hasFillInfo: Joi.boolean(),
    phoneNumber: Joi.string().max(11),
    wechat: Joi.string().max(32),
    alipay: Joi.string().max(32),
    timezone: Joi.string().max(32),
    saltHashedPassword: Joi.string().max(128),
    realName: Joi.string().max(32),
    birthday: Joi.date(),
    studentNumber: Joi.string().max(16),
    timezoneUpdatedAt: Joi.date(),
    isSubscribe: Joi.boolean(),
    invitatedBy: Joi.number().integer().positive(),
    target: Joi.string().max(256)
  })
});

module.exports = bookshelf.model('User', user);
