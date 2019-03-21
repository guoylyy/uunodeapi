'use strict';

/**
 * 定义 ubandBanner Schema
 */
const Joi = require('joi');
const bookshelf = require('../../mysql.connection');
const baseSchema = require('./base.schema');

let UbandBanner = baseSchema.BaseBookshelfModel.extend({
  tableName: 'uband_banner',

  createSchema: baseSchema.baseCreateSchema.keys({
    redirectId: Joi.string().max(128).required(),
    bannerType: Joi.string().max(64),
    imgUrl: Joi.string().max(255),
    isActive: Joi.number().allow(null).integer().positive()
  })
});

module.exports = bookshelf.model('UbandBanner', UbandBanner);
