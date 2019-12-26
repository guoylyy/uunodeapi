'use strict';

/**
 * 定义 ubandLike Schema
 * 用户笔芯的记录表
 *
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let UbandCard = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_like',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    appType: Joi.string().max(64),
    likeType: Joi.string().max(64),
    likeRemark: Joi.string().max(255),
    outBizId: Joi.number().positive(),
    likeCount: Joi.number().positive(),
    isValid:  Joi.boolean().default(false),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required()
  })
});

module.exports = bookshelf.model('UserLike', UbandCard);
