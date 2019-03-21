'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const enumModel = require('../../services/model/enum');
const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const clazzFeedbackService = require('../../services/clazzFeedback.service');
const clazzFeedbackMaterialService = require('../../services/clazzFeedbackMaterial.service');

let pub = {};

/**
 * 笃师获取反馈列表
 *
 * @param req
 * @param res
 */
pub.listFeedbacks = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.feedbackQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        let status = null;
        if (queryParam.isWaitingOnly) {
          status = enumModel.clazzFeedbackStatusEnum.WAITING.key;
        }

        return clazzFeedbackService.queryPagedFeedbacks(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize, status, queryParam.keyWord);
      })
      .then((result) => {
        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 笃师获取反馈素材列表
 *
 * @param req
 * @param res
 */
pub.listFeedbackMaterials = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.feedbackMaterialQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        return clazzFeedbackMaterialService.queryPagedFeedbackMaterials(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize);
      })
      .then((result) => {
        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取素材详情
 *
 * @param req
 * @param res
 */
pub.fetchFeedbackMaterial = (req, res) => {
  let materialId = req.params.materialId;

  schemaValidator.validatePromise(commonSchema.mongoIdSchema, materialId)
      .then((materialId) => {
        return clazzFeedbackMaterialService.fetchFeedbackMaterialById(materialId);
      })
      .then((materialItem) => {
        if (materialItem.clazz != req.__CURRENT_CLAZZ.id) {
          return apiRender.renderNotFound(res);
        }

        return apiRender.renderBaseResult(res, _.omit(materialItem, ['clazz']));
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 查看笃师一对一反馈条目下的消息列表
 *
 * @param req
 * @param res
 */
pub.listFeedbackReplys = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.feedbackRepliesQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        return clazzFeedbackService.queryFeedbackReplyList(req.__CURRENT_CLAZZ_FEEDBACK, req.__CURRENT_USER, req.__CURRENT_CLAZZ, queryParam.pageSize, queryParam.endDate, false, queryParam.startDate);
      })
      .then((result) => {
        // render数据
        return apiRender.renderBaseResult(res, result.values);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 回复笃师一对一
 *
 * @param req
 * @param res
 */
pub.replyFeedback = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.feedbackReplyBodySchema, req.body)
      .then((replyItem) => {
        debug(replyItem);

        req.__MODULE_LOGGER(`回复笃师一对一${ req.__CURRENT_CLAZZ_FEEDBACK.id }`, replyItem);

        return clazzFeedbackService.replyFeedback(req.__CURRENT_CLAZZ_FEEDBACK, replyItem, req.__CURRENT_USER, req.__IS_CURRENT_CLAZZ_TEACHER, req.__CURRENT_CLAZZ);
      })
      .then((feedbackItem) => {
        return apiRender.renderBaseResult(res, feedbackItem);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
