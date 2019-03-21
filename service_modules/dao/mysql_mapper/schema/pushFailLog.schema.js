'use strict';

/**
 * 定义 push_fail_log Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let pushFailLog = baseSchema.BaseBookshelfModel.extend({
  tableName: 'push_fail_log',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    clazzId: Joi.string().max(32).allow(null),
    postId: Joi.number().positive(),
    template: Joi.string().max(65535).required(),
    error: Joi.string().max(65535).required(),
    hasResend: Joi.boolean().default(false)
  })
});

module.exports = bookshelf.model('PushFailLog', pushFailLog);
