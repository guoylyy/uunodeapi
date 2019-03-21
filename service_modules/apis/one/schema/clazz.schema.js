'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));
const _ = require('lodash');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 更新笃师一对一状态body schema
 */
pub.updateFeedbackStatusBodySchema = Joi.object().keys({
  status: Joi.string().valid([enumModel.clazzFeedbackStatusEnum.REPLIED.key, enumModel.clazzFeedbackStatusEnum.WAITING.key]).required(),
  isNotify: Joi.boolean().default(false)
      .when("status", {
        is: enumModel.clazzFeedbackStatusEnum.WAITING.key,
        then: Joi.valid(false)
      }),
});

module.exports = pub;
