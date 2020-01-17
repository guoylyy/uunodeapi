'use strict';

const Joi = require('joi');
const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');
const pub = {};

/**
 * 更新banner
 */
pub.bannerSchema = Joi.object().keys({
  title: Joi.string().required(),
  image: Joi.string().required(),
  active: Joi.boolean().required(),
  linkUrl: Joi.string().required()
});

module.exports = pub;
