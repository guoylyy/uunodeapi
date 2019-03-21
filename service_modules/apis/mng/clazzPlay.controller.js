'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const apiRender = require('../render/api.render');

const apiUtil = require('../util/api.util');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzPlaySchema = require('./schema/clazzPlay.schema');

const commonError = require('../../services/model/common.error');

const clazzPlayService = require('../../services/clazzRolePlay.service');
const materialService = require('../../services/materialLibray.service');

const disposePlayMaterials = (clazzPlay, currentClazzId) => {
  const materialIdList = _.chain(clazzPlay)
      .get('sections', [])
      .map('dialogs')
      .map((dialogs) => _.map(dialogs, 'fileId'))
      .flatten()
      .value();

  debug(materialIdList);

  return materialService.queryClazzMaterials(currentClazzId, materialIdList)
      .then((materialList) => {
        debug(materialList);

        const materialMap = _.chain(materialList)
            .map((materialItem) => ({
              materialId: materialItem.id,
              materialType: materialItem.type,
              title: materialItem.title,
              url: materialItem.url
            }))
            .keyBy('materialId')
            .value();

        debug(materialMap);

        const playDialogs = _.chain(clazzPlay).get('sections', []).map('dialogs').flatten().value();

        debug(playDialogs);

        for (const dialog of playDialogs) {
          const fileId = dialog.fileId;

          const fileItem = _.get(materialMap, fileId, null);

          debug(fileId);
          debug(fileItem);

          if (!_.isNil(fileId) && _.isNil(fileItem)) {
            return Promise.reject(commonError.PARAMETER_ERROR('不存在的文件！'));
          }

          dialog.file = fileItem;

          // 去除无用字段
          delete  dialog.fileId;
        }

        clazzPlay.fileSize = _.chain(materialList)
            .map((item) => _.toInteger(item.fileSize))
            .sum()
            .value();

        clazzPlay.clazz = currentClazzId;

        return clazzPlay;
      });
};

const pub = {};

pub.queryClazzPlayList = (req, res) => {
  return schemaValidator.validatePromise(clazzPlaySchema.clazzPlayQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzPlayService.queryPagedClazzPlayList(
            req.__CURRENT_CLAZZ.id,
            queryParam.pageNumber,
            queryParam.pageSize
        );
      })
      .then((result) => {
        debug(result);

        const pickedClazzPlayList = _.map(result.values, apiUtil.pickClazzPlayBasicInfo);

        debug(pickedClazzPlayList);

        // render数据
        return apiRender.renderPageResult(res, pickedClazzPlayList, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.createClazzPlay = (req, res) => {
  return schemaValidator.validatePromise(clazzPlaySchema.clazzPlayCreateSchema, req.body)
      .then((clazzPlay) => {
        debug(clazzPlay);

        return disposePlayMaterials(clazzPlay, req.__CURRENT_CLAZZ.id);
      })
      .then((clazzPlay) => {
        return clazzPlayService.createClazzPlay(clazzPlay);
      })
      .then((createdClazzPlayItem) => {
        debug(createdClazzPlayItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.fetchClazzPlay = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const pickedClazzPlayItem = apiUtil.pickClazzPlayBasicInfo(req.__CURRENT_CLAZZ_ROLE_PLAY_ITEM);


        debug(pickedClazzPlayItem);

        return apiRender.renderBaseResult(res, pickedClazzPlayItem);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.updateClazzPlay = (req, res) => {
  return schemaValidator.validatePromise(clazzPlaySchema.clazzPlayCreateSchema, req.body)
      .then((clazzPlay) => {
        debug(clazzPlay);

        return disposePlayMaterials(clazzPlay, req.__CURRENT_CLAZZ.id);
      })
      .then((clazzPlay) => {
        debug(clazzPlay);

        clazzPlay.id = req.__CURRENT_CLAZZ_ROLE_PLAY_ITEM.id;

        return clazzPlayService.updateClazzPlayById(clazzPlay);
      })
      .then((updatedClazzPlayItem) => {
        debug(updatedClazzPlayItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.deleteClazzPlay = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzPlayService.destroyClazzPlayById(req.__CURRENT_CLAZZ_ROLE_PLAY_ITEM.id);
      })
      .then((destroyedClazzPlayItem) => {
        debug(destroyedClazzPlayItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
