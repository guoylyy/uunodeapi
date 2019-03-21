'use strict';

const _ = require('lodash');
const Joi = require('joi');

const enumModel = require('../../../services/model/enum');

let pub = {};

/**
 * 获取七牛上传token Body Schema
 */
pub.qiniuTokenBodySchema = Joi.object().keys({
  fileName: Joi.string().max(64).required(),
  attachType: Joi.string().valid(enumModel.qiniuFileTypeEnum.PUBLIC.key).required(),
  fileType: Joi.string().valid(enumModel.fileTypeEnum.voice.key).required()
});

module.exports = pub;
