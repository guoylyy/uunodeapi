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

/**
 * 更新banner
 */
pub.updateBanner = (banner) => {
  return bannerMapper.updateBannerById(banner)
}

/**
 * 更新banner顺序 上移
 */
pub.updateBannerSort = (bannerId) => {
  return bannerMapper.findById(bannerId)
  .then(banner1 => {
    if (_.isNil(banner1)) {
      winston.error('查询banner失败，参数错误！！！bannerId: %s', bannerId);
      return Promise.reject(commonError.PARAMETER_ERROR("banner不存在"));
    }
    return bannerMapper.findByParam({sort: --banner1.sort})
    .then(banner2 => {
      if (_.isNil(banner2)) {
        winston.error('上移banner失败');
        return Promise.reject(commonError.PARAMETER_ERROR("banner不能上移"));
      }
      banner1 = _.pick(banner1, ['id', 'sort']);
      banner2 = _.pick(banner2, ['id', 'sort']);
      banner2.sort++;
      return Promise.all([bannerMapper.updateBannerById(banner1), bannerMapper.updateBannerById(banner2)]);
    })
  });
}

module.exports = pub;