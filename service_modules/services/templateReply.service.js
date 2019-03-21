'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const templateReplyMapper = require('../dao/mongodb_mapper/templateReply.mapper');

let pub = {};

/**
 * 查询name开头的第一个消息模板
 *
 * @param name
 * @returns {*}
 */
pub.fetchTemplateByName = (name) => {
  if (_.isNil(name) || !_.isString(name)) {
    winston.error('获取消息模板列表失败！！！参数错误：%s', name);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return templateReplyMapper.query({ name: name })
      .then((templateList) => {
        debug(templateList);
        return _.head(templateList);
      });
};

module.exports = pub;
