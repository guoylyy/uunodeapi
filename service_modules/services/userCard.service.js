'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const userService = require('./user.service');

const userCardMapper = require('../dao/mysql_mapper/userCard.mapper')

let pub = {};

/**
 * 新建用户卡片
 * @type {{}}
 */
pub.createUserCard = (cardItem) => {
  if (!_.isPlainObject(cardItem) || !_.isNil(cardItem.id)) {
    winston.error('创建优惠券失败，参数错误！！！couponItem: %j', couponItem);
  }
  return userCardMapper.create(cardItem)
}

/**
 * 用户卡片列表
 * @type {{}}
 */
pub.fetchUserCardByUser = (userId) => {
  const couponQueryParam = {};

  couponQueryParam.userId = userId;

  return userCardMapper.fetchAllByParam(couponQueryParam);
}

/**
 * 删除卡片
 * @type {{}}
 */
pub.deleteUserCard = (cardId) => {
  return userCardMapper.destroy(cardId);
}

module.exports = pub;
