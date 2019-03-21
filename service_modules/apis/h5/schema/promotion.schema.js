'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));

const pub = {};

/**
 * 根据优惠码获取推广优惠信息query schema
 */
pub.promotonOfferQuerySchema = Joi.object().keys({
  promotionCode: Joi.string().max(16).required()
});

module.exports = pub;
