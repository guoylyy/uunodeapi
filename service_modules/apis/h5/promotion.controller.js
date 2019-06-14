'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const winston = require('winston');
const moment = require('moment');

const apiRender = require('../render/api.render');
const apiUtil = require('../util/api.util');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const promotionSchema = require('./schema/promotion.schema');

const wechatPromotion = require('../../lib/wechat.promotion');

const userService = require('../../services/user.service');
const promotionService = require('../../services/promotion.service');

const commonError = require('../../services/model/common.error');
const enumModel = require('../../services/model/enum');

const pub = {};

/**
 * 检查当前用户推广基本信息
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchPromotionInfo = (req, res) => {
  const currentUser = req.__CURRENT_USER;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const fetchPromotionUserPromise = promotionService.fetchPromotionUserByUserId(currentUser.id);
        const fetchPromotionIncomeMapPromise = promotionService.fetchPromotionIncomeMap(currentUser.id);

        return Promise.all([fetchPromotionUserPromise, fetchPromotionIncomeMapPromise])
      })
      .then(([promotionUser, incomeMap]) => {
        debug(promotionUser);
        debug(incomeMap);

        // 检查当前用户是否已经加入推广
        const isJoined = !_.isNil(promotionUser);
        // 用户加入天数
        const joinedDays = moment().diff(moment(currentUser.createdAt), 'days') + 1;

        const pickedUser = apiUtil.pickUserBasicInfo(currentUser);

        // 获取推广用户详情
        const pickedPromotionInfo = _.extend(
            {},
            apiUtil.pickPromotionUserBasicInfo(promotionUser, wechatPromotion.getWechatQrCodeUrlByTicket)
        );

        // 总收益 = 收入总额 - 飞走的
        pickedPromotionInfo.incomeSum = _.chain(incomeMap).values().sum().value() - _.get(incomeMap, enumModel.promotionIncomeStatusEnum.CANCELED.key, 0);
        pickedPromotionInfo.income = incomeMap;

        pickedUser.isJoined = isJoined;
        pickedUser.joinedDays = joinedDays;
        pickedUser.promotionInfo = pickedPromotionInfo;

        return apiRender.renderBaseResult(res, pickedUser);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 随机获取推广用户列表
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchSamplePromotionUserList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return promotionService.fetchSampledPromotionUserList();
      })
      .then((samplePromotionUsers) => {
        debug(samplePromotionUsers);

        const pickedUserList = _.map(samplePromotionUsers.joinedUserList, apiUtil.pickUserBasicInfo);

        return apiRender.renderBaseResult(res, {
          joinedCount: samplePromotionUsers.joinedCount,
          joinedUserList: pickedUserList
        });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 加入推广计划
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.joinPromotionUser = (req, res) => {
  const currentUserId = req.__CURRENT_USER.id;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((queryParam) => {
        debug(queryParam);

        return promotionService.fetchPromotionUserByUserId(currentUserId);
      }).then((promotionUser) => {
        if (!_.isNil(promotionUser)) {
          return Promise.reject(commonError.PARAMETER_ERROR('用户已加入伙伴中心'));
        }

        return wechatPromotion.createWechatQrcode(currentUserId);
      })
      .then((qrCodeInfo) => {
        debug(qrCodeInfo);

        return promotionService.createPromotionUser(currentUserId, JSON.stringify(qrCodeInfo));
      })
      .then((promotionUserItem) => {
        debug(promotionUserItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取按被邀用户分组的收益列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchUserGroupedPromotionIncomeList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return promotionService.fetchUserGroupedPromotionIncomes(req.__CURRENT_USER.id);
      })
      .then((promotionUserList) => {
        debug(promotionUserList);

        const pickedPromotionUserList = _.map(
            promotionUserList,
            (user) => {
              const pickedUser = apiUtil.pickUserBasicInfo(user);

              pickedUser.promotionInfo = user.promotionInfo;

              return pickedUser;
            }
        );

        return apiRender.renderBaseResult(res, pickedPromotionUserList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 根据被邀用户获取推广用户收益详情
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchInviteePromotionIncome = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, req.params.inviteeUserId);
      })
      .then((inviteeUserId) => {
        debug(inviteeUserId);

        return promotionService.fetchPromotionIncomesByInviteeId(inviteeUserId, req.__CURRENT_USER.id);
      })
      .then((inviteeUser) => {
        debug(inviteeUser);

        const pickedInviteeUser = apiUtil.pickUserBasicInfo(inviteeUser);

        const promotionInfo = inviteeUser.promotionInfo;

        promotionInfo.incomeList = _.map(promotionInfo.incomeList, apiUtil.pickPromotionUserIncomeBasicInfo);

        pickedInviteeUser.promotionInfo = promotionInfo;

        return apiRender.renderBaseResult(res, pickedInviteeUser);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取推广用户收益列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchPromotionIncomeList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return promotionService.fetchPromotionIncomesByPromoterId(req.__CURRENT_USER.id);
      })
      .then((incomeList) => {
        debug(incomeList);

        const pickedIncomeList = _.map(incomeList, (income) => {
          const pickedIncome = apiUtil.pickPromotionUserIncomeBasicInfo(income);

          pickedIncome.userInfo = apiUtil.pickUserBasicInfo(income.userInfo);

          return pickedIncome;
        });

        return apiRender.renderBaseResult(res, pickedIncomeList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 提取收益到优币
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.withdrawPromotionIncome = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return promotionService.transferIncomeToCoin(req.__CURRENT_USER.id);
      })
      .then((coinItem) => {
        debug(coinItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 根据优惠码获取推广优惠信息
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchPromotionOfferInfoByKey = (req, res) => {
  return schemaValidator.validatePromise(promotionSchema.promotonOfferQuerySchema, req.query)
      .then((queryParam) => {
        return promotionService.fetchPromotionUserByPromotionCode(queryParam.promotionCode);
      })
      .then((promotionUser) => {
        debug(promotionUser);
        const promotionUserItemId = _.get(promotionUser, 'userId', null);
        // 如果为推广用户本身，则忽略之
        if (promotionUserItemId === req.__CURRENT_USER.id) {
          return apiRender.renderResult(res,
              {
                code:400,
                message:'不能用自己的推广码'
              }
          )
        }else if(_.isNil(promotionUserItemId)){
          return apiRender.renderResult(res,
              {
                code:400,
                message:'不存在的推广码'
              }
          )
        }

        const pickedPromotionUser = apiUtil.pickPromotionUserBasicInfo(promotionUser, wechatPromotion.getWechatQrCodeUrlByTicket);
        const offerPrice = _.get(req.__CURRENT_CLAZZ, ['configuration', 'promotionOffer', 'firstOffer'], 0);

        return apiRender.renderBaseResult(res, {
          promotionUser: pickedPromotionUser,
          offerPrice: offerPrice
        });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 公开接口
 * 通过promoterUserId获取推广用户信息
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchPromotionUserInfoByUserId = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const promoterUserId = req.params.promoterUserId;

        const fetchUserPromise = userService.fetchById(promoterUserId),
            fetchPromotionInfoPromise = promotionService.fetchPromotionUserByUserId(promoterUserId);

        return Promise.all([fetchUserPromise, fetchPromotionInfoPromise]);
      })
      .then(([userInfo, promotionUser]) => {
        if (_.isNil(userInfo) || _.isNil(promotionUser)) {
          return apiRender.renderNotFound(res);
        }

        const pickedUserInfo = apiUtil.pickUserBasicInfo(userInfo);

        pickedUserInfo.promotionInfo = apiUtil.pickPromotionUserBasicInfo(promotionUser, wechatPromotion.getWechatQrCodeUrlByTicket);

        return apiRender.renderBaseResult(res, pickedUserInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
