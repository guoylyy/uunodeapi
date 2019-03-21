'use strict';

/**
 * 定义 userCoin Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let userCoin = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_coin',

  createSchema: baseSchema.baseCreateSchema.keys({
    coinChange: Joi.number().integer().required(),
    remark: Joi.string().max(255),
    title: Joi.string().max(32).required(),
    bizType: Joi.string().max(32).required(),
    bizId: Joi.number().positive(),
    userId: Joi.number().positive().required(),
    changeDate: Joi.date().required()
  })
});

module.exports = bookshelf.model('UserCoin', userCoin);
