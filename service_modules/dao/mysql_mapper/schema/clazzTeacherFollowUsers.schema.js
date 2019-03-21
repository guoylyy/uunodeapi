'use strict';

/**
 * 定义 ClazzTeacherFollowUsersSchema Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzTeacherFollowUsersSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_teacher_follow_users',

  createSchema: baseSchema.baseCreateSchema.keys({
    clazzTeacherId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    userId: Joi.number().integer().positive().required(),
    followAt: Joi.date()
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({})
});

module.exports = bookshelf.model('ClazzTeacherFollowUsersSchema', clazzTeacherFollowUsersSchema);
