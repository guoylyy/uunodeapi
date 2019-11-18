'use strict';

const debug = require('debug')('controller');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const wordSchema = require('./schema/word.schema');

const enumModel = require('../../services/model/enum');

const wordService = require('../../services/word.service');
const pub = {};

/**
 * 获取单词和解释
 * @param req
 * @param res
 */
pub.queryWord = (req, res) => {
  return schemaValidator.validatePromise(wordSchema.wordQuerySchema, req.query)
      .then((queryParam) => {
        let word = queryParam.word.trimLeft().trimRight().toLowerCase();
        return wordService.queryWord(word);
      })
      .then((words) => {
        if (words.length > 0) {
          return apiRender.renderBaseResult(res, words[0]);
        } else {
          return apiRender.renderNotFound(res);
        }
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户收藏的单词
 */
pub.getUserWords = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        return wordService.getUserWordList(1344);
      })
      .then((data) => {
        return apiRender.renderBaseResult(res, data);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 取消用户收藏的单词
 */
pub.removeUserWord = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.wordDeleteSchema, req.query)
      .then((queryParam) => {
        return wordService.removeUserWord(queryParam.wordSaveId);
      })
      .then((data) => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 导出单词列表
 */
pub.exportUserWord = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        let words = queryParam.words;
        debug(words);
        return wordService.exportWord(words);
      })
      .then((data) => {
        return apiRender.renderBaseResult(res, data);
      })
      .catch(req.__ERROR_HANDLER);
};


module.exports = pub;
