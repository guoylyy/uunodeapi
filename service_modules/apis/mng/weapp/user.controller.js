"use strict";

const _ = require("lodash");
const schemaValidator = require("../../schema.validator");
const commonSchema = require("../../common.schema");
const pagedBaseSchema = require("../schema/paged.base.schema");
const apiRender = require("../../render/api.render");
const enumModel = require("../../../services/model/enum");
const userBindService = require("../../../services/userBind.service");
const userSchema = require("../schema/user.schema");
const pub = {};

/**
 * 获取任务列表
 * 按时间倒序 分页
 */
pub.getUserList = (req, res) => {
  return schemaValidator
    .validatePromise(userSchema.pagedQuerySchema, req.query)
    .then(queryParam => {
      queryParam.type = 'WEAPP_ONE'
      return userBindService.pagedQuery(queryParam);
    })
    .then(result => {
      console.log(result);
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


module.exports = pub;
