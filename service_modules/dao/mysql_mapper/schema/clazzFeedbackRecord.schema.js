'use strict';

/**
 * 定义 clazz feedback record Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzFeedbackRecord = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_feedback_record',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().positive().required(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    teacherUserId: Joi.number().positive().required(),
    status: Joi.string().max(16).required(),
    bill: Joi.string().max(65535),
    appointmentStartDate: Joi.date(),
    appointmentEndDate: Joi.date(),
    realStartDate: Joi.date(),
    realEndDate: Joi.date()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(16),
    appointmentStartDate: Joi.date(),
    appointmentEndDate: Joi.date(),
    realStartDate: Joi.date(),
    realEndDate: Joi.date()
  })
});

module.exports = bookshelf.model('ClazzFeedbackRecord', clazzFeedbackRecord);
