'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');

const pub = {};

pub.clazzPlayQuerySchema = pagedBaseSchema;

pub.clazzPlayCreateSchema = Joi.object().keys({
  title: Joi.string().max(64).required(),
  targetDate: Joi.date().required(),
  sections: Joi.array().items(Joi.object().keys({
    sectionType: Joi.string().valid(_.keys(enumModel.clazzTaskIntroductionTypeEnum)).required(),
    dialogs: Joi.array().items({
      dialogType: Joi.string().valid(_.keys(enumModel.clazzPlayDialogTypeEnum)).required(),
      role: Joi.object().keys({
        roleType: Joi.string().valid(_.keys(enumModel.clazzPlayRoleTypeEnum)).required(),
        headImgUrl: Joi.string().empty('')
            .when('roleType', {
              is: enumModel.clazzPlayRoleTypeEnum.NO_BODY.key,
              then: Joi.allow(null),
              otherwise: Joi.required()
            }),
        name: Joi.string().empty('')
            .when('roleType', {
              is: enumModel.clazzPlayRoleTypeEnum.NO_BODY.key,
              then: Joi.allow(null),
              otherwise: Joi.required()
            })
      }).required(),
      placement: Joi.string().valid(_.keys(enumModel.clazzPlayDialogPlacementEnum)).required()
          .when('role.roleType', {
            is: enumModel.clazzPlayRoleTypeEnum.NO_BODY.key,
            then: Joi.valid(enumModel.clazzPlayDialogPlacementEnum.CENTER.key)
          }),
      dialogColorType: Joi.string()
          .when('placement', {
            is: enumModel.clazzPlayDialogPlacementEnum.RIGHT.key,
            then: Joi.valid(enumModel.clazzPlayDialogColorTypeEnum.DEFAULT.key),
            otherwise: Joi.valid(_.keys(enumModel.clazzPlayDialogColorTypeEnum))
          }).required(),
      content: Joi.string().empty('').when(
          'dialogType',
          {
            is: enumModel.clazzPlayDialogTypeEnum.TEXT.key,
            then: Joi.required(),
            otherwise: Joi.valid('')
          }
      ),
      fileId: commonSchema.mongoIdSchema.when(
          'dialogType',
          {
            is: enumModel.clazzPlayDialogTypeEnum.TEXT.key,
            otherwise: Joi.required()
          }
      )
    }).required()
  })).required()
});

module.exports = pub;
