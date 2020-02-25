"use strict";

const _ = require("lodash");
const winston = require("winston");
const Promise = require("bluebird");
const debug = require("debug")("service");
const bannerMapper = require("../dao/mongodb_mapper/banner.mapper");
const commonError = require("./model/common.error");

const pub = {};

/**
 * 查询banner列表
 */
pub.queryBannerList = (bizType, weappType = 'KOUYI') => {
  if (_.isNil(bizType)) {
    winston.error("查询banner失败，参数错误！！！bizType: %s", bizType);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  let queryParam = {};
  queryParam["bizType"] = bizType;
  queryParam["active"] = true;
  queryParam["weappType"] = weappType;
  return bannerMapper.queryBannerList(queryParam);
};

/**
 * 分页查询
 */
pub.queryPagedBannerList = param => {
  return bannerMapper.queryPagedBannerList(
    param,
    param.pageNumber,
    param.pageSize
  );
};

/**
 * 更新banner
 */
pub.updateBanner = banner => {
  return bannerMapper.updateBannerById(banner);
};

/**
 * 创建banner
 */
pub.createBanner = banner => {
  return bannerMapper
  .getMaxSortBanner()
  .then((maxBanner) => {
    console.log(maxBanner);
    const maxSort = maxBanner ? maxBanner.sort + 1 : 1;
    banner.active = true;
    banner.sort = maxSort;
    return bannerMapper.createBanner(banner);
  }
  )

};

/**
 * 更新banner顺序 上移
 */
pub.updateBannerSort = bannerId => {
  return bannerMapper.findById(bannerId).then(banner1 => {
    if (_.isNil(banner1)) {
      winston.error("查询banner失败，参数错误！！！bannerId: %s", bannerId);
      return Promise.reject(commonError.PARAMETER_ERROR("banner不存在"));
    }
    console.log(banner1);
    return bannerMapper
      .getMaxSortBanner(banner1.sort)
      .then(banner2 => {
        if (_.isNil(banner2)) {
          console.log("不能上移");
          return Promise.reject(commonError.PARAMETER_ERROR("banner不能上移"));
        }
        banner1 = _.pick(banner1, ["id", "sort"]);
        banner2 = _.pick(banner2, ["id", "sort"]);
        [banner2.sort, banner1.sort] = [banner1.sort, banner2.sort];
        return Promise.all([
          bannerMapper.updateBannerById(banner1),
          bannerMapper.updateBannerById(banner2)
        ]);
      });
  });
};

pub.deleteBanner = bannerId => {
  return bannerMapper.deleteById(bannerId);
}

module.exports = pub;
