'use strict';

/**
 * 定义 ubandCoin Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let UbandCard = baseSchema.BaseBookshelfModel.extend({
  tableName: 'uband_card',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    title: Joi.string().max(64),
    remark: Joi.string().max(255),
    scope: Joi.string().max(64),
    type: Joi.string().max(64),
    status: Joi.string().max(64),
    iconUrl: Joi.string().max(512),
    expireDate: Joi.date().required()
  })
});

module.exports = bookshelf.model('UbandCard', UbandCard);
