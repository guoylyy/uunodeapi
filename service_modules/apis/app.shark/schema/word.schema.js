'use strict';

const _ = require('lodash');
const Joi = require('joi');

const enumModel = require('../../../services/model/enum');

const pub = {};

/**
 * 单词删除
 */
pub.wordDeleteSchema = Joi.object().keys({
  wordSaveId: Joi.string().required()
});

/**
 * 单词详情查询
 */
pub.wordQuerySchema = Joi.object().keys({
  word: Joi.string().required(),
  brief: Joi.number().integer().positive().default(1)
});

/**
 * 导出单词
 */
pub.exportWordSchema = Joi.object().keys({
  words: Joi.array().items(Joi.string().required()).required()
});

module.exports = pub;
