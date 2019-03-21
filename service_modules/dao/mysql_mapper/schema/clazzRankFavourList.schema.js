'use strict';

/**
 * 定义 ClazzRankFavourList Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzRankFavourList = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_rank_favour_list',

  createSchema: baseSchema.baseCreateSchema.keys({
    clazzRankId: Joi.number().positive().required(),
    userId: Joi.number().positive().required(),
    favourAt: Joi.date().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({})
});

module.exports = bookshelf.model('ClazzRankFavourList', clazzRankFavourList);
