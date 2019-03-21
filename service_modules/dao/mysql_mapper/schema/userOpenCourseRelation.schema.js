'use strict';

/**
 * 定义 UserOpenCourseRelation Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const userOpenCourseRelationSchema = baseSchema.BaseBookshelfModel.extend({
  tableName: 'user_opencourse_relation',

  createSchema: baseSchema.baseCreateSchema.keys({
    userId: Joi.number().integer().positive().required(),
    openCourseId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    status: Joi.string().max(32)
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(32).required()
  })
});

module.exports = bookshelf.model('UserOpenCourseRelation', userOpenCourseRelationSchema);
