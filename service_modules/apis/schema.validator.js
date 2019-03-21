'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const Promise = require('bluebird');
const Joi = require("joi");

const joiCustomizeLanguage = require('../lib/joi.customized');
const commonError = require('../services/model/common.error');

const validatePromise = Promise.promisify(Joi.validate);

exports.validatePromise = (schema, value) => {
  if (!schema || !value) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return validatePromise(value, schema, { language: joiCustomizeLanguage })
      .catch((err) => {
        winston.error(err);

        // 根据不同环境决定返回的错误说明
        const message = global.IS_DEVLOPMENT_ENVIRONMENT
            ? _.get(err.details, '0.message', '参数错误')
            : '参数错误';

        return Promise.reject(commonError.PARAMETER_ERROR(message));
      });
};
