'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const attachService = require('../../services/attach.service');
const materialService = require('../../services/materialLibray.service');

const pub = {};

/**
 * 分页获取班级任务素材列表
 *
 * @param req
 * @param res
 */
pub.queryPagedMaterialList = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.taskMaterialQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return materialService.queryPagedClazzMaterials(req.__CURRENT_CLAZZ.id, queryParam.type, queryParam.pageNumber, queryParam.pageSize, queryParam.keyword);
      })
      .then((result) => {
        debug(result);

        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 新建任务素材
 *
 * @param req
 * @param res
 */
pub.createMaterial = (req, res) => {
  let globalMaterialItem;
  schemaValidator.validatePromise(clazzSchema.createTaskMaterialBodySchema, req.body)
      .then((materialItem) => {
        globalMaterialItem = materialItem;
        debug(globalMaterialItem);

        return attachService.queryAttachList([globalMaterialItem.attachId]);
      })
      .then((attachList) => {
        if (_.isEmpty(attachList)) {
          return Promise.reject(commonError.PARAMETER_ERROR('不存在的附件'));
        }

        // 设置班级
        globalMaterialItem.clazz = req.__CURRENT_CLAZZ.id;
        globalMaterialItem.attach = attachList[0].id;

        delete globalMaterialItem.attachId;

        return materialService.createClazzMaterial(globalMaterialItem);
      })
      .then((materialItem) => {
        debug(materialItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 删除任务素材
 * 假删除
 *
 * @param req
 * @param res
 */
pub.deleteMaterial = (req, res) => {
  let materialId = req.params.materialId;

  schemaValidator.validatePromise(commonSchema.mongoIdSchema, materialId)
      .then((materialId) => {
        debug(materialId);

        return materialService.queryClazzMaterials(req.__CURRENT_CLAZZ.id, [materialId]);
      })
      .then((materialList) => {
        if (_.isEmpty(materialList)) {
          return Promise.reject(commonError.PARAMETER_ERROR('不存在的任务素材'));
        }

        debug(materialList);

        return materialService.deleteClazzMaterial(materialId);
      })
      .then((materialItem) => {
        debug(materialItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 将素材列表复制到当前班级中
 *
 * @param req
 * @param res
 */
pub.duplicateMaterials = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.duplicateMaterialsBodySchema, req.body)
      .then((materials) => {
        debug(materials);

        return materialService.duplicateClazzMaterials(req.__CURRENT_CLAZZ.id, materials.ids);
      })
      .then((materialItems) => {
        debug(materialItems);

        return apiRender.renderBaseResult(res, _.map(materialItems, 'id'));
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
