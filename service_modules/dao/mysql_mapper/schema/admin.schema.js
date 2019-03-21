'use strict';

/**
 * 定义 user Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let admin = baseSchema.BaseBookshelfModel.extend({
  tableName: 'admin',

  createSchema: baseSchema.baseCreateSchema.keys({
    phoneNumber: Joi.string().trim().max(16).required(),
    saltPassword: Joi.string().trim().max(128).required(),
    name: Joi.string().trim().max(32).required(),
    role: Joi.string().max(32).required(),
    headImgUrl: Joi.string().uri().max(256),
    authToken: Joi.string().max(512).allow(null),
    authExpire: Joi.date()
  })
});

module.exports = bookshelf.model('Admin', admin);
