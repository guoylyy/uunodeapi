'use strict';

/**
 * 定义 ubandCoin Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let ubandCoin = baseSchema.BaseBookshelfModel.extend({
  tableName: 'uband_coin',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    coinChange: Joi.number().integer().required(),
    transactionId: Joi.string().max(128),
    title: Joi.string().max(32).required(),
    remark: Joi.string().max(255),
    changeDate: Joi.date().required(),
    ext_params: Joi.string()
  })
});

module.exports = bookshelf.model('UbandCoin', ubandCoin);
