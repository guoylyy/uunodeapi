'use strict';

const Joi = require('joi');
const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');
const pub = {};

/**
 * 更新banner
 */
pub.updateBannerSchema = Joi.object().keys({
  title: Joi.string(),
  image: Joi.string(),
  active: Joi.boolean(),
  image: commonSchema.mongoIdSchema,
  linkUrl: Joi.string()
});

module.exports = pub;
