"use strict";

const _ = require("lodash");
const schemaValidator = require("../schema.validator");
const commonSchema = require("../common.schema");
const apiRender = require("../render/api.render");
const enumModel = require('../../services/model/enum');
const taskService = require("../../services/biyiTask.service");
const taskSchema = require("./schema/task.schema");
const winston = require('winston');
const pub = {};

/**
 * 获取任务列表
 * 按时间倒序 分页
 */
pub.getTaskList = (req, res) => {
  return schemaValidator
    .validatePromise(taskSchema.pagedSchema, req.query)
    .then(queryParam => {
      console.log(queryParam);
      
      queryParam.status = enumModel.taskStatusEnum.PUBLISHED.key;
      return taskService.queryTaskList(queryParam);
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
 * 查询任务详情
 */
pub.getTask = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.taskId)
  .then(taskId => {
    const param = {};
    param.task = {};
    param.taskId = taskId
    param.userId = req.__CURRENT_USER.id;
    return Promise.all([
      taskService.fetchById(taskId), 
      taskService.getCheckinList(param)
    ])
    .then(([
      task, 
      checkinList
    ])=> {
      task.myCheckin = null;
      if (!_.isEmpty(checkinList)) {
        task.myCheckin = checkinList[0];
      }
      return task;
    });
  })
  .then(result => {
    return apiRender.renderBaseResult(res, result)
  })
  .catch(req.__ERROR_HANDLER);
};

/**
 * 获取今日任务
 */
pub.getTodayTask = (req, res) => {
    return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
    .then(() => {
      return taskService.fetchTodayTask();
    })
    .then(result => {
      //todo 当前用户是否已经打卡
      result = _.map(result, function(task) { 
        return _.extend({}, task, {isCheckin: false});
      });
      if (!_.isNil(req.__CURRENT_USER)) {
        let checkinCountQuery = _.map(result, function(task) { 
          return taskService.countByParam({taskId: task.id, userId: req.__CURRENT_USER.id})
        });
        return Promise.all(checkinCountQuery)
        .then(checkinCountList => {
          for (let i=0; i< checkinCountList.length; i++) {
            result[i].isCheckin = !!(checkinCountList[i] > 0);
          }
          return result;
        });
      }
      return result;
    })
    .then(result => {
      return apiRender.renderBaseResult(res, result)
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 打卡接口
 */
pub.checkin = (req, res) => {
  return schemaValidator.validatePromise(taskSchema.checkinSchema, req.body)
  .then((taskCheckin) => {
    taskCheckin.taskId = req.__TASK_ITEM.id;
    taskCheckin.userId = req.__CURRENT_USER.id;
    return taskService.checkin(taskCheckin);
  })
  .then((result) => {
    return apiRender.renderBaseResult(res, result);
  })
  .catch(req.__ERROR_HANDLER);
}

/**
 * 获取我的打卡记录
 */
pub.getMyCheckinList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.taskId)
  .then(() => {
    const param = {};
    param.task = {};
    param.taskId = req.__TASK_ITEM.id;
    param.userId = req.__CURRENT_USER.id;
    return taskService.getCheckinList(param);
  })
  .then((result) => {
    return apiRender.renderBaseResult(res, result)
  })
  .catch(req.__ERROR_HANDLER);
}

/**
 * 获取打卡记录列表分页 广场接口
 */
pub.getCheckinList = (req, res) => {
  return schemaValidator.validatePromise(taskSchema.checkinPagedSchema, req.query)
  .then((param) => {
    param.task = {};
    param.taskId = req.__TASK_ITEM.id;
    param.userId = {
      $ne: req.__CURRENT_USER.id
    }
    return taskService.queryPagedCheckinList(param);
  })
  .then((result) => {
    // 处理点赞数和是否点赞
    result.values.forEach((checkin) => {
      checkin.likeCount = (checkin.likeArr || []).length;
      checkin.liked = (checkin.likeArr || []).includes(req.__CURRENT_USER.id);
      checkin.likeArr = undefined;
    })
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
 * 点赞打卡记录
 */
pub.likeCheckin = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
  .then(() => {
    return taskService.likeCheckin(req.__CURRENT_USER.id, req.__TASK_CHECKIN_ITEM);
  })
  .then(() => {
    return apiRender.renderSuccess(res)
  })
  .catch(req.__ERROR_HANDLER);
};

/**
 * 取消点赞打卡
 */
pub.cancelLikeCheckin = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
  .then(() => {
    return taskService.cancelLikeCheckin(req.__CURRENT_USER.id, req.__TASK_CHECKIN_ITEM);
  })
  .then(() => {
    return apiRender.renderSuccess(res)
  })
  .catch(req.__ERROR_HANDLER);
}

/**
 * 更新打卡记录 译文
 */
pub.updateTaskCheckin = (req, res) => {
  return schemaValidator.validatePromise(taskSchema.updateCheckinSchema, req.body)
  .then((param) => {
    return taskService.updateTaskCheckin(req.__TASK_CHECKIN_ITEM.id, param);
  })
  .then(() => {
    return apiRender.renderSuccess(res)
  })
  .catch(req.__ERROR_HANDLER);
}

/**
 * 获取分享信息
 */
pub.getShareInfo = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.checkinId)
  .then((checkinId) => {
    return taskService.getShareInfo(checkinId);
  }).then(result => {

    return apiRender.renderBaseResult(res, result);
  })
  .catch(req.__ERROR_HANDLER);
}

module.exports = pub;
