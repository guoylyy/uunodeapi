'use strict';

/**
 * 定义 clazz account record Schema
 * 记录长期班的账单及课程时间
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzAccountRecord = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_account_record',

  createSchema: baseSchema.baseCreateSchema.keys({
    bill: Joi.string().max(65535),
    clazzAccountId: Joi.number().positive().required(),
    userId: Joi.number().integer().positive().required(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    userId: Joi.number().integer().positive(),
    endDate: Joi.date()
  })
});

module.exports = bookshelf.model('ClazzAccountRecord', clazzAccountRecord);
