'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));
const commonSchema = require('../../common.schema');
const enumModel = require('../../../services/model/enum');

const pub = {};

const pagedBaseSchema = require('./paged.base.schema');

pub.queryLessonListSchema = pagedBaseSchema.keys({
    type: Joi.string().valid(_.keys(enumModel.lessonTypeEnum))
});

module.exports = pub;
