'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');

const apiRender = require('../render/api.render');
const apiUtil = require('../util/api.util');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const clazzLuckyCheckinService = require('../../services/clazzLuckyCheckin.service');

const commonError = require('../../services/model/common.error');

const pub = {};

/**
 * 随机抽取班级打卡记录
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.drawCLazzCheckins = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.createClazzLuckyCheckinSchema, req.body)
      .then((luckyCheckin) => {
        debug(luckyCheckin);

        const luckyDate = luckyCheckin.date;

        return clazzLuckyCheckinService.queryClazzLuckyCheckinByDate(req.__CURRENT_CLAZZ.id, luckyDate)
            .then((luckyCheckinItem) => {
              if (!_.isNil(luckyCheckinItem)) {
                return Promise.reject(commonError.BIZ_FAIL_ERROR('当天已经抽打卡！'));
              }

              return clazzLuckyCheckinService.createClazzLuckyCheckin(
                  req.__CURRENT_CLAZZ.id,
                  luckyDate,
                  luckyCheckin.luckyNumber
              );
            });
      })
      .then((luckyCheckinItem) => {
        const pickedLuckyCheckinItem = apiUtil.pickClazzLuckyCheckinBasicInfo(luckyCheckinItem);

        return apiRender.renderBaseResult(res, pickedLuckyCheckinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取班级抽打卡详情
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryClazzLuckyCheckin = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.queryClazzLuckyChekinSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzLuckyCheckinService.queryClazzLuckyCheckinByDate(req.__CURRENT_CLAZZ.id, queryParam.date);
      })
      .then((luckyCheckinItem) => {
        const pickedLuckyCheckinItem = apiUtil.pickClazzLuckyCheckinBasicInfo(luckyCheckinItem);

        return apiRender.renderBaseResult(res, pickedLuckyCheckinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取被抽的打卡列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchLuckyCheckinList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzLuckyCheckinService.fetchCheckinListById(req.params.luckyCheckinId);
      })
      .then((checkinList) => {
        return apiRender.renderBaseResult(res, checkinList);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
