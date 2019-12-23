'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');
const bannerMapper = require('../dao/mongodb_mapper/banner.mapper')
const commonError = require('./model/common.error');

const pub = {};

/**
 * 查询banner列表
 */
pub.queryBannerList = (bizType) => {
    if (_.isNil(bizType)) {
        winston.error('查询banner失败，参数错误！！！bizType: %s', bizType);
        return Promise.reject(commonError.PARAMETER_ERROR());
      }
    let queryParam = {};
    queryParam['bizType'] = bizType;
    return bannerMapper.queryBannerList(queryParam);
}

module.exports = pub;