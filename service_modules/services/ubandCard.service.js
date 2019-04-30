'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const winston = require('winston');
const Promise = require('bluebird');
const enumModel = require('../../service_modules/services/model/enum');
const queryModel = require("../../service_modules/services/model/queryEnum");
const ubandCardMapper = require('../dao/mysql_mapper/ubandCard.mapper');

const pub = {};

/**
 * 新建一个用户卡片
 * @param cardItem
 */
pub.createUbandCard = (cardItem) =>{
  if (!_.isPlainObject(cardItem) || !_.isNil(cardItem.id)) {
    winston.error('创建卡片失败，参数错误！！！couponItem: %j', couponItem);
  }

  return ubandCardMapper.create(cardItem)
}


/**
 * 获取一个用户所有的卡片
 *   - 根据 status 获取
 */
pub.queryUserAvailableCard = (userId, status) => {
   let queryParams = {
     'userId':userId,
   }
   if(status != queryModel.ubandCardQueryStatusEnum.ALL.key){
     queryParams['status'] = status;
   }
   return ubandCardMapper.fetchAllByParam(queryParams);
};


/**
 * 更新用户卡片信息
 */
pub.update = (cardItem) => {
  if (!_.isPlainObject(cardItem) || _.isNil(cardItem.id)) {
    winston.error('更新 ubandCard 记录失败，参数错误！！！ cardItem: %j', cardItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return ubandCardMapper.update(cardItem);
};

module.exports = pub;
