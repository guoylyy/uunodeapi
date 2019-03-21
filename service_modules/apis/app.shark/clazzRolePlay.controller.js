'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const apiRender = require('../render/api.render');

const commonSchema = require('../common.schema');

const apiUtil = require('../util/api.util');

const clazzPlayService = require('../../services/clazzRolePlay.service');

const pub = {};

pub.queryClazzPlayList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzPlayService.queryClazzPlayListByClazzAccountId(req.__CURRENT_CLAZZ, req.__CURRENT_CLAZZ_ACCOUNT.id);
      })
      .then((clazzPlayList) => {
        const pickedPlayList = _.map(clazzPlayList, (playItem) => {
          const pickedPlayItem = apiUtil.pickClazzPlayBasicInfo(playItem);

          pickedPlayItem.targetDate = moment(playItem.targetDate).format('YYYY-MM-DD');

          return pickedPlayItem;
        });

        return apiRender.renderBaseResult(res, pickedPlayList);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.fetchClazzPlayItem = (req, res) => {
  const playId = req.params.playId;

  const checkPlayIdPromise = schemaValidator.validatePromise(commonSchema.mongoIdSchema, playId);
  const checkEmptyQueryPromise = schemaValidator.validatePromise(commonSchema.emptySchema, req.query);

  return Promise.all([checkPlayIdPromise, checkEmptyQueryPromise])
      .then(([playId, queryParam]) => {
        debug(playId);
        debug(queryParam);

        return clazzPlayService.fetchClazzPlayById(req.__CURRENT_CLAZZ.id, playId);
      })
      .then((clazzPlayItem) => {
        const pickedClazzPlayItem = apiUtil.pickClazzPlayBasicInfo(clazzPlayItem);

        return apiRender.renderBaseResult(res, pickedClazzPlayItem);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
