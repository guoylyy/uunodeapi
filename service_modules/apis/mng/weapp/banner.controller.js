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

const bannerSchema = require("../schema/banner.schema");

const pub = {};

/**
 * 获取banner列表
 * @param req
 * @param res
 */
pub.getBanners = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.emptySchema, req.query)
    .then(() => {
      return bannerService.queryBannerList(bannerBizTypeEnum.LESSON.key);
    })
    .then(result => {
      return apiRender.renderBaseResult(res, result);
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
    .validatePromise(bannerSchema.updateBannerSchema, req.body)
    .then(banner => {
      banner.id = req.params.bannerId;
      return bannerService.updateBanner(banner);
    })
    .then(result => {
      return apiRender.renderBaseResult(res, result);
    })
    .catch(req.__ERROR_HANDLER);
};

pub.updateBannerSort = (req, res) => {
  return schemaValidator
  .validatePromise(commonSchema.mongoIdSchema, req.params.bannerId)
  .then((bannerId) => {
    return bannerService.updateBannerSort(bannerId);
  })
  .then(() => {
    return apiRender.renderSuccess(res);
  })
  .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
