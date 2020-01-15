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
 * 更新任务
 */
pub.updateTask = (req, res) => {
  return schemaValidator
    .validatePromise(taskSchema.createTaskSchema, req.body)
    .then(task => {
      task.id = req.params.taskId;
      return taskService.updateTask(task);
    })
    .then(result => {
      console.log(result);
      return apiRender.renderSuccess(res);
    })
    .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
