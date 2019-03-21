'use strict';

/**
 * 定义 user card Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

const clazzAccount = baseSchema.BaseBookshelfModel.extend({
  tableName: 'clazz_account',

  createSchema: baseSchema.baseCreateSchema.keys({
    status: Joi.string().max(16).required(),
    joinDate: Joi.date().required(),
    userId: Joi.number().integer().positive().required(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i).required(),
    wechatInfo: Joi.string().max(65535),
    bill: Joi.string().max(65535),
    invitations: Joi.string().max(65535),
    endDate: Joi.date(),
    clazzScore: Joi.number().integer().min(0).default(0),
    feedbackRound: Joi.number().integer().min(0).default(0),
    easemobFriendCount: Joi.number().integer().min(0),
    purchasedFeedbackCount: Joi.number().integer().min(0),
    usedFeedbackCount: Joi.number().integer().min(0)
  }),

  updateSchema: baseSchema.baseUpdateSchema.keys({
    status: Joi.string().max(16),
    joinDate: Joi.date(),
    userId: Joi.number().integer().positive(),
    clazzId: Joi.string().regex(/^[a-f\d]{24}$/i),
    addCheckinCount: Joi.number().min(0),
    bill: Joi.string().max(65535),
    invitations: Joi.string().max(65535),
    endDate: Joi.date(),
    clazzScore: Joi.number().integer().min(0),
    feedbackRound: Joi.number().integer().min(0),
    easemobFriendCount: Joi.number().integer().min(0),
    purchasedFeedbackCount: Joi.number().integer().min(0),
    usedFeedbackCount: Joi.number().integer().min(0)
  })
});

module.exports = bookshelf.model('ClazzAccount', clazzAccount);
