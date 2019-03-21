'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const wechatTicketSchema = require('./schema/wechatTicket.schema');
const queryUtil = require('../util/queryUtil');

let pub = {};

pub.fetchLatest = () => {
  return wechatTicketSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, {}, []);
      })
      .orderBy('createdAt', 'desc')
      .fetch()
      .then((wechatTicketItem) => {
        debug('--- fetch success ---');
        debug(wechatTicketItem);

        return wechatTicketItem.toJSON();
      });
};

pub.create = (wechatTicketItem) => {
  if (!_.isPlainObject(wechatTicketItem) || !_.isNil(wechatTicketItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to save: %j', wechatTicketItem);
  return wechatTicketSchema.forge(wechatTicketItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((wechatTicketItem) => {
        debug('--- Save success ---');
        debug(wechatTicketItem);

        return wechatTicketItem.toJSON();
      });
};

module.exports = pub;
