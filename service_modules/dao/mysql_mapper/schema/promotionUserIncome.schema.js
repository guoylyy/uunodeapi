'use strict';

/**
 * 定义 promotionUserIncome Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const promotionUserIncomeSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'promotion_user_income',

  createSchema: baseSchema.baseCreateSchema.keys({
    promoterUserId: Joi.number().integer().positive().required(),
    inviteeUserId: Joi.number().integer().positive().required(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    userPayId: Joi.number().integer().positive(),
    status: Joi.string().max(32).required(),
    inviteeUserBenefit: Joi.number().integer().min(0).required(),
    promoterUserIncome: Joi.number().integer().min(0).required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(32),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i)
  })
});

module.exports = bookshelf.model('PromotionUserIncome', promotionUserIncomeSchema);
