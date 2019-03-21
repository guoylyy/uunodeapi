'use strict';

const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const winston = require('winston');

const systemConfig = require('../../../config/config');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const apiRender = require('../render/api.render');
const apiUtil = require('../util/api.util');

const wechatTemplateReply = require('../../lib/wechat.template.reply');
const wechatTemplateMessage = require('../../lib/wechat.template.message');

const clazzRankService = require('../../services/clazzRank.service');
const userService = require('../../services/user.service');

const commonError = require('../../services/model/common.error');

const pub = {};

/**
 * 分页获取课程排行榜列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryPagedClazzRank = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.clazzRankQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        const clazzId = req.__CURRENT_CLAZZ.id,
            userId = req.__CURRENT_USER.id,
            queryDate = _.min([new Date(), req.__CURRENT_CLAZZ.endDate]);

        return clazzRankService.queryPagedClazzRankList(
            clazzId,
            queryParam.pageNumber,
            queryParam.pageSize,
            queryDate,
            userId
        );
      })
      .then((pagedClazzRank) => {
        const pickedRankList = _.map(pagedClazzRank.values, apiUtil.pickClazzRankBasicInfo);

        return apiRender.renderPageResult(
            res,
            pickedRankList,
            pagedClazzRank.itemSize,
            pagedClazzRank.pageSize,
            pagedClazzRank.pageNumber
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取当前学员排行信息
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchCurrentUserClazzRank = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const clazzId = req.__CURRENT_CLAZZ.id,
            userId = req.__CURRENT_USER.id,
            queryDate = _.min([new Date(), req.__CURRENT_CLAZZ.endDate]);

        return clazzRankService.queryUserClazzRank(clazzId, userId, queryDate);
      })
      .then((userClazzRank) => {
        return apiRender.renderBaseResult(res, apiUtil.pickClazzRankBasicInfo(userClazzRank));
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 点赞排行榜条目
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.favourClazzRank = (req, res) => {
  const clazzRankId = req.params.rankId,
      currentUserId = req.__CURRENT_USER.id,
      nowMoment = moment();

  const nowDate = nowMoment.toDate();

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((requestBody) => {
        debug(requestBody);

        if (nowMoment.isAfter(req.__CURRENT_CLAZZ.endDate)) {
          return Promise.reject(commonError.PARAMETER_ERROR('课程已结束，无法点赞'));
        }

        return clazzRankService.fetchClazzRankById(clazzRankId, currentUserId, nowDate);
      })
      .then((clazzRankItem) => {
        debug(clazzRankItem);
        const clazzId = clazzRankItem.clazzId;

        if (clazzId !== req.__CURRENT_CLAZZ.id) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        if (_.get(clazzRankItem, ['favourInfo', 'isFavour'], false)) {
          return Promise.reject(commonError.PARAMETER_ERROR('已经为好友点赞'));
        }

        return clazzRankService.createClazzRankFavourItem(clazzRankId, currentUserId)
            .then((createdClazzRankFavour) => {
              debug(createdClazzRankFavour);

              const favourSum = _.get(clazzRankItem, ['favourInfo', 'sum'], 0) + 1;

              clazzRankItem.favourInfo = {
                isFavour: true,
                sum: favourSum
              };

              return clazzRankItem;
            });
      })
      .then((userClazzRank) => {
        debug(userClazzRank);

        return apiRender.renderBaseResult(res, apiUtil.pickClazzRankBasicInfo(userClazzRank));
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
