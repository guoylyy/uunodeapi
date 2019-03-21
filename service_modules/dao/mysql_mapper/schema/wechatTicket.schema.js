'use strict';

/**
 * 定义 wechat_ticket Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let wechatTicket = baseSchema.BaseBookshelfModel.extend({
  tableName: 'wechat_ticket',

  createSchema: baseSchema.baseCreateSchema.keys({
    ticket: Joi.string().max(512).required()
  })
});

module.exports = bookshelf.model('WechatTicket', wechatTicket);
