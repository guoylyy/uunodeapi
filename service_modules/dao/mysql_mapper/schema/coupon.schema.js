'use strict';

/**
 * 定义 coupon Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let coupon = baseSchema.BaseBookshelfModel.extend({
  tableName: 'coupon',

  createSchema: baseSchema.baseCreateSchema.keys({
    money: Joi.number().integer().positive().max(15).required(),
    expireDate: Joi.date().required(),
    remark: Joi.string().max(65535),
    status: Joi.string().max(32).required(),
    userId: Joi.number().positive().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    money: Joi.number().integer().positive(),
    status: Joi.string().max(32),
    expireDate: Joi.date(),
    remark: Joi.string().max(65535).allow(''),
  })
});

module.exports = bookshelf.model('Coupon', coupon);
