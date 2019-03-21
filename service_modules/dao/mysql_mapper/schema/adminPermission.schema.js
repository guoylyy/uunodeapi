'use strict';

/**
 * 定义 user Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let adminPermission = baseSchema.BaseBookshelfModel.extend({
  tableName: 'admin_permission',

  createSchema: baseSchema.baseCreateSchema.keys({
    adminId: Joi.number().integer().positive().required(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i),
    permissionType: Joi.string().trim().max(32).required(),
    permissionName: Joi.string().trim().max(32).required(),
  })
});

module.exports = bookshelf.model('AdminPermission', adminPermission);
