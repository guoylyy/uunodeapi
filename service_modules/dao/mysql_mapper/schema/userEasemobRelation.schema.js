'use strict';

/**
 * 定义 UserEasemobRelation Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const userEasemobRelationSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_easemob_relation',

  createSchema: baseSchema.baseCreateSchema.keys({
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    userBindId: Joi.number().integer().positive().required(),
    partnerBindId: Joi.number().integer().positive().required(),
    status: Joi.string().max(32)
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(32).required()
  })
});

module.exports = bookshelf.model('UserEasemobRelation', userEasemobRelationSchema);
