'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const winston = require('winston');
const Promise = require('bluebird');

const advMapper = require('../dao/mysql_mapper/advEntity.mapper');

let pub = {};

/**
 * 获取所有的广告列表
 * @param advType
 * @return {Promise<TResult>|Promise}
 */
pub.queryOpenAdv = (advType) =>{
  let queryParams = {
    type: advType,
    isOpen: true
  };
  return advMapper.queryAll(queryParams);
};

module.exports = pub;

