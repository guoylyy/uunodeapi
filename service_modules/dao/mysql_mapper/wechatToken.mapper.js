'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const wechatTokenSchema = require('./schema/wechatToken.schema');
const queryUtil = require('../util/queryUtil');

let pub = {};

pub.fetchLatest = () => {
  return wechatTokenSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, {}, []);
      })
      .orderBy('createdAt', 'desc')
      .fetch()
      .then((wechatTokenItem) => {
        debug('--- fetch success ---');
        debug(wechatTokenItem);

        return wechatTokenItem.toJSON();
      });
};

pub.create = (wechatTokenItem) => {
  if (!_.isPlainObject(wechatTokenItem) || !_.isNil(wechatTokenItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', wechatTokenItem);
  return wechatTokenSchema.forge(wechatTokenItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((wechatTokenItem) => {
        debug('--- Save success ---');
        debug(wechatTokenItem);

        return wechatTokenItem.toJSON();
      });
};

module.exports = pub;
