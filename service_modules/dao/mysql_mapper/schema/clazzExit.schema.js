'use strict';

/**
 * 定义 user exit Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzExit = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_exit',

  createSchema: baseSchema.baseCreateSchema.keys({
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    userId: Joi.number().positive().required(),
    clazzAccountId: Joi.number().positive().required(),
    status: Joi.string().max(16).required(),
    applyDate: Joi.date().required(),
    userCoins: Joi.number().integer().min(0),
    realUserCoins: Joi.number().integer().min(0),
    userCoinId: Joi.number().positive(),
    userReason: Joi.string().max(255),
    remark: Joi.string().max(255)
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(16),
    realUserCoins: Joi.number().integer().min(0),
    userCoinId: Joi.number().positive().allow(null),
    remark: Joi.string().max(255)
  })
});

module.exports = bookshelf.model('ClazzExit', clazzExit);
