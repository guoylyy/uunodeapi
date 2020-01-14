"use strict";

const _ = require("lodash");
const schemaValidator = require("../../schema.validator");
const commonSchema = require("../../common.schema");
const pagedBaseSchema = require("../schema/paged.base.schema");
const apiRender = require("../../render/api.render");
const enumModel = require("../../../services/model/enum");
const taskService = require("../../../services/task.service");
const taskSchema = require("../schema/task.schema");
const pub = {};

/**
 * 获取任务列表
 * 按时间倒序 分页
 */
pub.getTaskList = (req, res) => {
  return schemaValidator
    .validatePromise(taskSchema.pagedSchema, req.query)
    .then(queryParam => {
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
 * 删除任务
 */
pub.deleteTask = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.taskId)
    .then(taskId => {
      return taskService.deleteTask(taskId);
    })
    .then(result => {
      console.log(result);
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 创建任务
 */
pub.createTask = (req, res) => {
  return schemaValidator
    .validatePromise(taskSchema.createTaskSchema, req.body)
    .then(task => {
      return taskService.createTask(task);
    })
    .then(result => {
      console.log(result);
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 查询任务详情
 */
pub.getTask = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.mongoIdSchema, req.params.taskId)
    .then(taskId => {
      return Promise.all([
        taskService.fetchById(taskId),
        taskService.countByParam({
          taskId: taskId,
          userId: req.__CURRENT_USER.id
        })
      ]).then(([task, checkinCount]) => {
        task.myCheckinCount = checkinCount;
        return task;
      });
    })
    .then(result => {
      return apiRender.renderBaseResult(res, result);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 获取打卡记录列表分页 广场接口
 */
pub.getCheckinList = (req, res) => {
  return schemaValidator
    .validatePromise(taskSchema.checkinPagedSchema, req.query)
    .then(param => {
      param.task = {};
      param.task.id = req.__TASK_ITEM.id;
      return taskService.queryPagedCheckinList(param);
    })
    .then(result => {
      // 处理点赞数和是否点赞
      result.values.forEach(checkin => {
        checkin.likeCount = (checkin.likeArr || []).length;
        checkin.liked = (checkin.likeArr || []).includes(req.__CURRENT_USER.id);
        checkin.likeArr = undefined;
      });
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
 * 删除打卡记录
 */
pub.deleteTaskCheckin = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.emptySchema, req.query)
    .then(() => {
      return taskService.deleteTaskCheckin(req.__TASK_CHECKIN_ITEM.id);
    })
    .then(() => {
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 更新打卡记录 标题
 */
pub.updateTaskCheckin = (req, res) => {
  return schemaValidator
    .validatePromise(taskSchema.updateCheckinSchema, req.body)
    .then(param => {
      return taskService.updateTaskCheckin(req.__TASK_CHECKIN_ITEM.id, param);
    })
    .then(() => {
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

/**
 * 增加观看人数
 */
pub.addViewLog = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.emptySchema, req.body)
    .then(param => {
      const viewLog = req.__TASK_CHECKIN_ITEM.viewLog || [];
      viewLog.push({ userId: req.__CURRENT_USER.id, createdAt: new Date() });
      return taskService.updateTaskCheckin(req.__TASK_CHECKIN_ITEM.id, {
        viewLog: viewLog
      });
    })
    .then(() => {
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
