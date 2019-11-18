'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const wordMapper = require('../dao/mongodb_mapper/word.mapper');
const wordSaveByUserMapper = require('../dao/mongodb_mapper/wordSaveByUser.mapper');

let pub = {};

/**
 * 查询单词
 * @param word
 * @return {*}
 */
pub.queryWord = (word) => {
  debug(word);
  if (_.isNil(word)) {
    winston.error('错误的单词');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return wordMapper.query({'word': word});
};

/**
 * 查看用户收藏的单词
 *
 * TODO:分页
 */
pub.getUserWordList = (userId) => {
  debug(userId);
  if (_.isNil(userId)) {
    winston.error('无效的用户');
    return Promise.reject(commonError.PARAMETER_ERROR());
  } else {
    return wordSaveByUserMapper.query({'userId': 1344}); //Mock
  }
};

/**
 * 删除用户单词
 */
pub.removeUserWord = (saveId) => {
  return wordSaveByUserMapper.deleteById(saveId);
};

/**
 * 导出用户单词到列表
 */
pub.exportWord = (words) => {
  debug(words);
  if (_.isNil(words) || words.length == 0) {
    winston.error('无法导出空单词列表');
    return Promise.reject(commonError.BIZ_FAIL_ERROR());
  } else {
    return true;
  }
};

module.exports = pub;
