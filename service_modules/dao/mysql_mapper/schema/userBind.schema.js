'use strict';

/**
 * 定义 userBind Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const userBindSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_bind',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().integer().positive().required(),
    type: Joi.string().max(32).required(),
    uuid: Joi.string().max(64).required(),
    accountName: Joi.string().max(32).required(),
    password: Joi.string().max(128)
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    userId: Joi.number().integer().positive(),
    uuid: Joi.string().max(64),
    accountName: Joi.string().max(32),
    password: Joi.string().max(128)
  })
});

module.exports = bookshelf.model('UserBind', userBindSchema);
