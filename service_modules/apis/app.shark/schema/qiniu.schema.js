'use strict';

const _ = require('lodash');
const Joi = require('joi');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 获取七牛上传token Body Schema
 */
pub.qiniuTokenBodySchema = Joi.object().keys({
  fileName: Joi.string().max(128).required(),
  attachType: Joi.string().valid(enumModel.qiniuFileTypeEnum.CHECKIN_REPOSITORY.key).required(),
  fileType: Joi.string().valid(_.keys(enumModel.fileTypeEnum)).required()
});

module.exports = pub;
