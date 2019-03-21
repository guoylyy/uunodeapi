'use strict';

/**
 * 定义 UserDataProfile Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const userDataProfile = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_data_profile',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    type: Joi.string().max(32).required(),
    rank: Joi.number().integer().positive().required(),
    value: Joi.number().positive().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
  })
});

module.exports = bookshelf.model('UserDataProfile', userDataProfile);
