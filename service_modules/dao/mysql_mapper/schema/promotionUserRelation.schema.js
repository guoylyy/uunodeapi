'use strict';

/**
 * 定义 promotionUserRelation Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const promotionUserRelationSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'promotion_user_relation',

  createSchema: baseSchema.baseCreateSchema.keys({
    promotionId: Joi.number().integer().positive().required(),
    promoterUserId: Joi.number().integer().positive().required(),
    inviteeUserId: Joi.number().integer().positive().required(),
    type: Joi.string().max(32).required(),
    invitedTime: Joi.date().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({})
});

module.exports = bookshelf.model('PromotionUserRelation', promotionUserRelationSchema);
