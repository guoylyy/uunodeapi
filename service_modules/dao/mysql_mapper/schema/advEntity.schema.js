'use strict';

/**
 * 定义广告的 schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');


let advEntity = baseSchema.BaseBookshelfModel.extend({
  tableName: 'adv_entity',

  createSchema: baseSchema.baseCreateSchema.keys({
    id: Joi.number().integer().positive(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i),
    image: Joi.string().trim().max(512).required(),
    title: Joi.string().trim().max(128).required(),
    type: Joi.string().trim().max(32).required(),
    price: Joi.number().integer(),
    description: Joi.string().allow('').optional(),
    redirectKey: Joi.string().trim().max(32).required(),
    redirectLink: Joi.string().trim().max(512).required(),
    isOpen: Joi.boolean().default(false),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required()
  })
});

module.exports = bookshelf.model('AdvEntity', advEntity);
