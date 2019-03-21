'use strict';

/**
 * 定义 userWithdrawLog Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let userWithdrawLog = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_withdraw_log',

  createSchema: baseSchema.baseCreateSchema.keys({
    logType: Joi.string().max(32).required(),
    logContent: Joi.string().max(65535)
  })
});

module.exports = bookshelf.model('UserWithdrawLog', userWithdrawLog);