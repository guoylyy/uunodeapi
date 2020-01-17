"use strict";

const debug = require("debug")("controller");
const Promise = require("bluebird");
const moment = require("moment");

const schemaValidator = require("../../schema.validator");
const commonSchema = require("../../common.schema");

const systemConfig = require("../../../../config/config");
const commonError = require("../../../services/model/common.error");
const apiRender = require("../../render/api.render");

const jwtUtil = require("../../util/jwt.util");
const apiUtil = require("../../util/api.util");

const bannerService = require("../../../services/banner.service");
const enumModel = require("../../../services/model/enum");
const bannerBizTypeEnum = enumModel.bannerBizTypeEnum;
const pagedBaseSchema = require("../schema/paged.base.schema");
const bannerSchema = require("../schema/banner.schema");

const pub = {};

/**
 * 获取banner列表
 * @param req
 * @param res
 */
pub.getBanners = (req, res) => {
  return schemaValidator
    .validatePromise(pagedBaseSchema, req.query)
    .then(param => {
      param.bizType = bannerBizTypeEnum.LESSON.key;
      return bannerService.queryPagedBannerList(param);
    })
    .then(result => {
      return apiRender.renderPageResult(
        res,
        result.values,
        result.itemSize,
        result.pageSize,
        result.pageNumber
      );
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 更新banner状态
 * @param req
 * @param res
 */
pub.updateBanner = (req, res) => {
  return schemaValidator
    .validatePromise(bannerSchema.bannerSchema, req.body)
    .then(banner => {
      banner.id = req.params.bannerId;
      return bannerService.updateBanner(banner);
    })
    .then(result => {
      return result
        ? apiRender.renderSuccess(res)
        : apiRender.renderParameterError(res, "更新失败");
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 上移banner
 */
pub.moveUpBanner = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.bannerId)
    .then(bannerId => {
      return bannerService.updateBannerSort(bannerId);
    })
    .then(result => {
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 新增banner
 * @param req
 * @param res
 */
pub.createBanner = (req, res) => {
  return schemaValidator
    .validatePromise(bannerSchema.bannerSchema, req.body)
    .then(banner => {
      banner.linkType = enumModel.bannerLinkTypeEnum.URL.key;
      banner.bizType = bannerBizTypeEnum.LESSON.key;
      return bannerService.createBanner(banner);
    })
    .then(result => {
      return apiRender.renderSuccess(res)
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 删除banner
 */
pub.deleteBanner = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.bannerId)
    .then(bannerId => {
      return bannerService.deleteBanner(bannerId);
    })
    .then(result => {
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};


module.exports = pub;
