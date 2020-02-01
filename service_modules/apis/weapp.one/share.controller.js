"use strict";

const _ = require("lodash");
const schemaValidator = require("../schema.validator");
const commonSchema = require("../common.schema");
const pagedBaseSchema = require("./schema/paged.base.schema");
const apiRender = require("../render/api.render");
const debug = require("debug")("controller");
const enumModel = require('../../services/model/enum');
const taskService = require("../../services/task.service");
const taskSchema = require("./schema/task.schema");
const winston = require('winston');
const pub = {};

/**
 * 分享打卡详情接口
 */
pub.getCheckin = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.checkinId)
  .then(checkinId => {
    return taskService.getShareCheckin(checkinId);
  })
  .then(checkin => {
    checkin.likeCount = (checkin.likeArr || []).length;
    checkin.liked = (!!req.__CURRENT_USER && (checkin.likeArr || []).includes(req.__CURRENT_USER.id));
    checkin.likeArr = undefined;
    return apiRender.renderBaseResult(res, checkin)
  })
  .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
