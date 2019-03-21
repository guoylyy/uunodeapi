'use strict';

const Joi = require('joi');

// 基础的page Schema
module.exports = Joi.object().keys({
  pageNumber: Joi.number().integer().positive().default(1),
  pageSize: Joi.number().integer().positive().default(10)
});
