'use strict';

/**
 * 定义 ClazzRankList Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzRankList = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_rank_list',

  createSchema: baseSchema.baseCreateSchema.keys({
    clazzId: Joi.string().max(32).required(),
    userId: Joi.number().positive().required(),
    rank: Joi.number().positive().required(),
    grade: Joi.number().positive().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    rank: Joi.number().positive(),
    grade: Joi.number().positive()
  })
});

module.exports = bookshelf.model('ClazzRankList', clazzRankList);
