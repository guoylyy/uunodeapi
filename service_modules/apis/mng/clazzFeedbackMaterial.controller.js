'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const clazzFeedbackMaterialService = require('../../services/clazzFeedbackMaterial.service');

let pub = {};

/**
 * 分页列出课程笃师一对一反馈素材列表
 *
 * @param req
 * @param res
 */
pub.queryPagedClazzFeedbackMaterials = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.feedbackMaterialQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzFeedbackMaterialService.queryPagedFeedbackMaterials(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize, queryParam.keyword);
      })
      .then((result) => {
        debug(result);

        // 数据筛选
        result.values = _.map(result.values, (clazzFeedback) => _.pick(clazzFeedback, ['id', 'title', 'updatedAt']));
        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 新建笃师一对一反馈素材
 *
 * @param req
 * @param res
 */
pub.createClazzFeedbackMaterial = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.feedbackReplySchema, req.body)
      .then((materialItem) => {
        debug(materialItem);

        materialItem.clazz = req.__CURRENT_CLAZZ.id;
        materialItem.author = req.__CURRENT_ADMIN.name;

        debug(materialItem);

        return clazzFeedbackMaterialService.createFeedbackMaterial(materialItem);
      })
      .then((materialItem) => {
        debug(materialItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取笃师一对一反馈素材详情
 *
 * @param req
 * @param res
 */
pub.fetchClazzFeedbackMaterial = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(res, _.pick(req.__CURRENT_CLAZZ_FEEDBACK_MATERIAL, ['id', 'title', 'content']));
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新笃师一对一反馈素材
 *
 * @param req
 * @param res
 */
pub.updateClazzFeedbackMaterial = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.feedbackMaterialEditSchema, req.body)
      .then((materialItem) => {
        debug(materialItem);

        materialItem.id = req.params.materialId;
        materialItem.clazz = req.__CURRENT_CLAZZ.id;
        materialItem.author = req.__CURRENT_ADMIN.name;

        debug(materialItem);

        return clazzFeedbackMaterialService.updateFeedbackMaterial(materialItem);
      })
      .then((materialItem) => {
        debug(materialItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 删除笃师一对一素材详情
 *
 * @param req
 * @param res
 */
pub.deleteClazzFeedbackMaterial = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((requestBody) => {
        debug(requestBody);

        return clazzFeedbackMaterialService.deleteFeedbackMaterial(req.params.materialId);
      })
      .then((materialItem) => {
        debug(materialItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
