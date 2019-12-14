'use strict';

const Joi = require('joi');
const commonSchema = require('../../common.schema');
const pub = {};

/**
 * 学员退班记录Schema
 */
pub.advSchema = Joi.object().keys({
  advId: Joi.number().integer().required()
});

/**
 * 新建广告Schema
 */
pub.createAdvSchema = Joi.object().keys({
  image: Joi.string().required(),
  title: Joi.string().required(),
  type: Joi.string().required(),
  price: Joi.number().integer(),
  description: Joi.string().allow('').optional(),
  redirectKey: Joi.string().required(),
  redirectLink: Joi.string().required(),
  isOpen: Joi.boolean().default(false)
});


/**
 * 更新广告Schema
 */
pub.updateAdvSchema = Joi.object().keys({
  image: Joi.string(),
  title: Joi.string(),
  type: Joi.string(),
  price: Joi.number().integer(),
  description: Joi.string().allow('').optional(),
  redirectKey: Joi.string(),
  redirectLink: Joi.string(),
  isOpen: Joi.boolean()
});



module.exports = pub;
