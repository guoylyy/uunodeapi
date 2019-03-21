'use strict';

/**
 * 定义 promotionUser Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const promotionUserSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'promotion_user',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().integer().positive().required(),
    qrcode: Joi.string().max(65535).required(),
    key: Joi.string().max(32).required(),
    joinDate: Joi.date().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({})
});

module.exports = bookshelf.model('PromotionUser', promotionUserSchema);
