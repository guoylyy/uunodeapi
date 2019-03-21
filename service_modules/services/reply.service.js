'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const replyMapper = require('../dao/mongodb_mapper/reply.mapper');

let pub = {};

/**
 * 查询以name开头的reply列表
 *
 * @param name
 * @returns {*}
 */
pub.queryReplyListStartWithName = (name) => {
  if (_.isNil(name) || !_.isString(name)) {
    winston.error('获取回复列表失败！！！参数错误：%s', name);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 替换掉正则表达式中具有特殊意义的字符
  const safeRegExpName = name.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
  debug(safeRegExpName);

  // return replyMapper.query({ name: new RegExp('^' + safeRegExpName, 'i') });
  return replyMapper.query({ name: safeRegExpName
  });
};

module.exports = pub;
