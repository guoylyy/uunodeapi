'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const ubandCoinMapper = require('../dao/mysql_mapper/ubandCoin.mapper');

const pub = {};

pub.isTransactionIdsExisted = (transactionIds) => {
  return ubandCoinMapper.fetchOneByParam({ transactionId: transactionIds })
      .then((coinItem) => {
        debug(coinItem);

        return !_.isNil(coinItem);
      });
};

pub.createUbandCoin = (userId, coins, receipt) => {
  return ubandCoinMapper.create({
    userId: userId,
    coinChange: coins,
    transactionId: receipt.transactionId,
    title: "用户充值",
    remark: "用户充值",
    changeDate: new Date(),
    ext_params: JSON.stringify(receipt)
  });
};

pub.sumUbandCoins = (userId) => {
  return ubandCoinMapper.sumUserUbandCoin(userId);
};

pub.costUbandCoin = (userId, coins, title, remark) => {
  return ubandCoinMapper.create({
    userId: userId,
    coinChange: -coins,
    title: title,
    remark: remark || title,
    changeDate: new Date()
  });
};

module.exports = pub;
