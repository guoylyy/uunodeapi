"use strict";

const _ = require("lodash");
const schemaValidator = require("../schema.validator");
const commonSchema = require("../common.schema");
const pagedBaseSchema = require("./schema/paged.base.schema");
const apiRender = require("../render/api.render");
const debug = require("debug")("controller");
const enumModel = require('../../services/model/enum');
const taskService = require("../../services/task.service");
const userLikeService = require('../../services/userLike.service');
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


/**
 * 用户分享打卡动作记录
 */

/**
 * 分享打卡记录
 */
pub.shareCheckin = (req, res) =>{
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then(() => {
        winston.info('分享打卡记录');
        return userLikeService.fetchUserLikeFromTasks(req.__CURRENT_USER.id,
            [enumModel.userLikeTaskEnum.SHAREWORK_TASK.key], 'WECHAT_MINI_KY');
      })
      .then((likes) => {
        if(_.size(likes) == 0){
          return userLikeService.createUserLike(req.__CURRENT_USER.id, enumModel.userLikeTaskEnum.SHAREWORK_TASK.key,
              'WECHAT_MINI_KY', 10)
              .then((userLikeItem) => {
                return apiRender.renderBaseResult(res, {'result': true, 'pointChange': 10})
              });
        }else{
          return apiRender.renderBaseResult(res,{'result': true});
        }
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
