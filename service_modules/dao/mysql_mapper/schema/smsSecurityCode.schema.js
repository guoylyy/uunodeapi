'use strict';

/**
 * 定义 smsSecurityCode Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const smsSecurityCodeSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'sms_security_code',

  createSchema: baseSchema.baseCreateSchema.keys({
    code: Joi.string().required(),
    phoneNumber: Joi.string().max(16).required(),
    expireAt: Joi.date().required(),
    codeType: Joi.string().max(32).required(),
    userId: Joi.number().allow(null).integer().positive()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    expireAt: Joi.date()
  })
});

module.exports = bookshelf.model('SmsSecurityCode', smsSecurityCodeSchema);
