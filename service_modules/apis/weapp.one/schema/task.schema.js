'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));
const commonSchema = require('../../common.schema');
const enumModel = require('../../../services/model/enum');

const pub = {};

const pagedBaseSchema = require('./paged.base.schema');

pub.pagedSchema = pagedBaseSchema.keys({
    theme: Joi.string().valid(_.keys(enumModel.taskThemeEnum)),
    language: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)),
    oppoLanguage: Joi.string().valid(_.keys(enumModel.taskLanguageEnum)),
    gtDuration: Joi.number().integer().positive(),
    ltDuration: Joi.number().integer().positive(),
});

module.exports = pub;
