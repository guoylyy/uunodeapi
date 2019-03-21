'use strict';

/**
 * 定义 systemConfig Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const systemConfigSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'system_config',

  createSchema: baseSchema.baseCreateSchema.keys({
    type: Joi.string().max(64).required(),
    key: Joi.string().max(64).required(),
    value: Joi.string().max(255).required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    value: Joi.string().max(255).required()
  })
});

module.exports = bookshelf.model('SystemConfig', systemConfigSchema);
