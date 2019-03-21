'use strict';

/**
 * 定义 post Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const post = baseSchema.BaseBookshelfModel.extend({
  tableName: 'post',

  createSchema: baseSchema.baseCreateSchema.keys({
    title: Joi.string().max(64).required(),
    status: Joi.string().max(32).required(),
    clazzId: Joi.string().max(32).required(),
    postType: Joi.string().max(32).required(),
    targetDate: Joi.date().required(),
    target: Joi.string().trim().max(1024).required(),
    result: Joi.string().trim().max(65535),
    stickied: Joi.boolean().default(false),
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(32),
    result: Joi.string().trim().max(65535)
  })
});

module.exports = bookshelf.model('Post', post);
