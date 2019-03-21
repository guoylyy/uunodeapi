'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));
const _ = require('lodash');

const commonSchema = require('../../common.schema');
const pagedBaseSchema = require('./paged.base.schema');

const enumModel = require('../../../services/model/enum');

const pub = {};

pub.teacherListQuerySchema = pagedBaseSchema;

pub.teacherMeatySharingListQuerySchema = pagedBaseSchema;

pub.teacherCommendListQuerySchema = pagedBaseSchema;

pub.pagedTeacherClazzListQuerySchema = pagedBaseSchema;

pub.teacherClazzListQuerySchema = Joi.object().keys({
  status: Joi.string().valid(enumModel.clazzStatusEnum.OPEN.key).required()
});

module.exports = pub;
