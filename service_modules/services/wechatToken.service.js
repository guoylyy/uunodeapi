'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const wechatTicketMapper = require('../dao/mysql_mapper/wechatTicket.mapper');
const wechatTokenMapper = require('../dao/mysql_mapper/wechatToken.mapper');

let pub = {};

pub.fetchLatestAccessToken = () => {
  return wechatTokenMapper.fetchLatest();
};

pub.fetchLatestTicket = () => {
  return wechatTicketMapper.fetchLatest();
};

pub.saveAccessToken = (accessToken) => {
  return wechatTokenMapper.create({
    token: accessToken
  });
};

pub.saveTicket = (ticket) => {
  return wechatTicketMapper.create({
    ticket: ticket
  })
};

module.exports = pub;
