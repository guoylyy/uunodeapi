'use strict';

/**
 * 定义 userConfig Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const userBindSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_config',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().integer().positive().required(),
    configApp: Joi.string().max(32).required(),
    configType: Joi.string().max(32).required(),
    configValue: Joi.string().max(128).required(),
    isValid: Joi.boolean().default(true),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    userId: Joi.number().integer().positive().required(),
    configApp: Joi.string().max(32).required(),
    configType: Joi.string().max(32).required(),
    configValue: Joi.string().max(128).required(),
    isValid: Joi.boolean().default(true),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required()
  })
});

module.exports = bookshelf.model('UserConfig', userBindSchema);
