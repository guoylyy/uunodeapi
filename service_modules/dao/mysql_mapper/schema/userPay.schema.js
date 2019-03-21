'use strict';

/**
 * 定义 user pay Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let userPay = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_pay',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().integer().positive().required(),
    status: Joi.string().max(16).required(),
    payway: Joi.string().max(32).required(),
    prepayId: Joi.string().max(64).required(),
    payTime: Joi.date().required(),
    payInfo: Joi.string().max(65535),
    transactionId: Joi.string().max(32),
    outBizId: Joi.string().max(32),
    outBizType: Joi.string().max(32),
    bookingNo: Joi.string().max(32),
    bill: Joi.string().max(65535)
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(16).required(),
    transactionId: Joi.string().max(32)
  })
});

module.exports = bookshelf.model('UserPay', userPay);
