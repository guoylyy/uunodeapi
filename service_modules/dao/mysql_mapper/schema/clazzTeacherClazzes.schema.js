'use strict';

/**
 * 定义 ClazzTeacherClazzesSchema Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzTeacherClazzesSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_teacher_clazzes',

  createSchema: baseSchema.baseCreateSchema.keys({
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    clazzTeacherId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    studentCount: Joi.number().positive().required()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    studentCount: Joi.number().positive()
  })
});

module.exports = bookshelf.model('ClazzTeacherClazzesSchema', clazzTeacherClazzesSchema);
