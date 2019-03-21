'use strict';

/**
 * 定义 UserScoreRecord Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const userScoreRecord = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_score_record',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    adminId: Joi.number().positive().required(),
    scoreChange: Joi.number().integer().min(0).default(0).required(),
    type: Joi.string().max(32).required(),
    targetId: Joi.string().max(32).required(),
    remark: Joi.string().max(256),
    changeAt: Joi.date().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    scoreChange: Joi.number().integer().min(0),
    remark: Joi.string().max(256)
  })
});

module.exports = bookshelf.model('UserScoreRecord', userScoreRecord);
