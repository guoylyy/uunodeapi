'use strict';

/**
 * 定义 post Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const post = baseSchema.BaseBookshelfModel.extend({
  tableName: 'school',

  createSchema: baseSchema.baseCreateSchema.keys({
    name: Joi.string().max(64).required(),
    province: Joi.string().max(32).required(),
    isOpen: Joi.boolean().default(false),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required()
  })

});

module.exports = bookshelf.model('School', post);
