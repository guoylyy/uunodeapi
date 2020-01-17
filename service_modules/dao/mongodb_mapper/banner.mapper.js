"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require("lodash");
const debug = require("debug")("mapper");

const bannerSchema = require("./schema/banner.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");

const QUERY_SAFE_PARAM = ["bizType", "active"];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  "title",
  "image",
  "linkType",
  "linkUrl",
  "active"
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: "sort" }]);

const pub = {};

/**
 * 根据参数查询banner
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryBannerList = queryParam => {
  return bannerSchema.queryList(
    queryParam,
    QUERY_SAFE_PARAM,
    QUERY_SELECT_COLUMNS,
    QUERY_ORDER_BY
  );
};

/**
 * 分页列出课程列表
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedBannerList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return bannerSchema.queryPaged(
    queryParam,
    QUERY_SAFE_PARAM,
    QUERY_SELECT_COLUMNS,
    pageNumber,
    pageSize,
    QUERY_ORDER_BY
  );
};

/**
 * 根据id更新banner
 */
const safeUpdateParamList = ["title", "image", "active", "linkUrl", "sort"]; // 限制可更新的字段
pub.updateBannerById = banner => {
  return bannerSchema.updateItemById(
    banner.id,
    mongoUtil.pickUpdateParams(banner, safeUpdateParamList)
  );
};

/**
 * 创建banner
 */
pub.createBanner = banner =>{
  return bannerSchema.createItem(banner);
}

/**
 * 根据id查找banner对象
 */
pub.findById = id => {
  return bannerSchema.findItemById(id);
};

const safeParamList = ["sort"];
/**
 * 根据param查找banner对象
 */
pub.findByParam = param => {
  return bannerSchema.findItemByParam(param, safeParamList);
};

module.exports = pub;
