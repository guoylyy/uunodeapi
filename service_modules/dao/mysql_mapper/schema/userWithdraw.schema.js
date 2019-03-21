/**
 * Created by violinsolo on 11/02/2017.
 */
'use strict';

/**
 * 定义 userWithdraw Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let userWithdraw = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_withdraw',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    payway: Joi.string().max(32).required(),
    score: Joi.number().integer().required(),
    applyMoney: Joi.number().integer().required(),
    status: Joi.string().max(32).required(),
    keyWord: Joi.string().max(256),
    remark: Joi.string().max(256),
    applyDate: Joi.date().required()
  })
});

module.exports = bookshelf.model('UserWithdraw', userWithdraw);
