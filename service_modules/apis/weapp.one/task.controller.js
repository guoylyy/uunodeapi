"use strict";

const _ = require("lodash");
const schemaValidator = require("../schema.validator");
const commonSchema = require("../common.schema");
const apiRender = require("../render/api.render");
const debug = require("debug")("controller");
const enumModel = require('../../services/model/enum');
const taskService = require("../../services/task.service");
const attachService = require("../../services/attach.service");
const pub = {};

/**
 * 获取任务列表
 * 按时间倒序 分页
 */
pub.getTaskList = (req, res) => {
  return schemaValidator
    .validatePromise(commonSchema.emptySchema, req.query)
    .then(queryParam => {
      debug(queryParam);
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
    return taskService.fetchById(taskId);
  })
  .then(result => {
    return apiRender.renderBaseResult(res, result)
  })
  .catch(req.__ERROR_HANDLER);
};

/**we
 * 获取今日任务
 */
pub.getTodayTask = (req, res) => {
    return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
    .then(() => {
      return taskService.fetchTodayTask();
    })
    .then(result => {
      return apiRender.renderBaseResult(res, result)
    })
    .catch(req.__ERROR_HANDLER);
};

module.exports = pub;