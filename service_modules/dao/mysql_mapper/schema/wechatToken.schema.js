'use strict';

/**
 * 定义 wechat_token Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let wechatToken = baseSchema.BaseBookshelfModel.extend({
  tableName: 'wechat_token',

  createSchema: baseSchema.baseCreateSchema.keys({
    token: Joi.string().max(512).required()
  })
});

module.exports = bookshelf.model('WechatToken', wechatToken);
