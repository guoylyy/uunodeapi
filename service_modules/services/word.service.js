'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const wordMapper = require('../dao/mongodb_mapper/word.mapper');

let pub = {};

/**
 * 查询单词
 * @param word
 * @return {*}
 */
pub.queryWord = (word) =>{
  debug(word);
  if (_.isNil(word)) {
    winston.error('错误的单词');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return wordMapper.query({'word':word});
};

module.exports = pub;
