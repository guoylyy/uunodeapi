'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const winston = require('winston');
const moment = require('moment');

const apiUtil = require('../util/api.util');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const wechatPayment = require('../../lib/wechat.payment');
const wechatPromotion = require('../../lib/wechat.promotion');

const clazzService = require('../../services/clazz.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const userCoinService = require('../../services/userCoin.service');
const couponService = require('../../services/coupon.service');
const promotionService = require('../../services/promotion.service');
const clazzExitService = require('../../services/clazzExit.servie');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const clazzUtil = require('../../services/util/clazz.util');

let pub = {};

/**
 * 根据班级状态分页列出课程
 * 当status为OPEN时，列出开放报名中的班级列表
 * 当status为PROCESSING时，列出当前用户正在进行中的班级
 * 当status为CLOSE时，列出当前用户已关闭的班级列表
 * @param req
 * @param res
 */
pub.queryClazzList = (req, res) => {
  // 1. 检出用户输入
  return schemaValidator.validatePromise(clazzSchema.clazzQuerySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        // 2. 根据status的不同调用不同的service方法，他们均返回课程列表
        if (queryParams.status === enumModel.clazzStatusEnum.OPEN.key) {
          req.__MODULE_LOGGER('获取报名课程列表', queryParams);

          // return a list of clazz
          return clazzService.queryClazzes(queryParams.status, null, null, null)
              .then((clazzList) => _.filter(clazzList, clazzUtil.checkIsClazzShow));
        }

        // 参数限制
        let joinStatus;
        switch (queryParams.status) {
          case enumModel.clazzStatusEnum.PROCESSING.key:
            if (queryParams.isCheckinable === true) {
              req.__MODULE_LOGGER('获取打卡课程列表', queryParams);
            } else {
              req.__MODULE_LOGGER('获取进行中课程列表', queryParams);
            }

            joinStatus = [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key];
            break;
          case enumModel.clazzStatusEnum.CLOSE.key:
            if (queryParams.isCheckinable === true) {
              return Promise.reject(commonError.PARAMETER_ERROR('不支持的查询方式'));
            }

            req.__MODULE_LOGGER('获取已结束课程列表', queryParams);
            joinStatus = [enumModel.clazzJoinStatusEnum.CLOSE.key, enumModel.clazzJoinStatusEnum.CANCELED.key];
            break;
          default:
            winston.error('获取课程列表失败，参数错误！！！queryParams: %j', queryParams);
            return Promise.reject(commonError.PARAMETER_ERROR('不支持的课程状态'));
        }

        const CURRENT_USER = req.__CURRENT_USER;
        // return a list like [[clazz], [clazzAccount]]
        return clazzAccountService.queryUserClazzByStatus(CURRENT_USER, joinStatus, queryParams.isCheckinable)
            .then((results) => {
              const clazzList = results[0],
                  clazzAccountMap = _.keyBy(results[1], 'clazzId');

              // return a list of clazz
              return _.reduce(clazzList,
                  (filteredClazzList, clazzItem) => {
                    const clazzAccountStatus = _.get(clazzAccountMap, [clazzItem.id, 'status'], null);

                    // 只保留要显示的课程
                    if (clazzUtil.checkIsClazzShowForAccount(clazzItem, clazzAccountStatus)) {
                      filteredClazzList.push(clazzItem);
                    }

                    return filteredClazzList;
                  },
                  []
              );
            });
      })
      .then((clazzList) => {
        // 筛选数据
        const pickedClazzes = _.map(
            clazzList,
            (clazz) => {
              const pickedClazz = _.pick(clazz, ['id', 'name', 'description', 'status', 'banner', 'startDate', 'endDate', 'author', 'hasCheckin']);
              pickedClazz.clazzJoinType = clazzUtil.getClazzJoinType(_.get(clazz, ['configuration', 'clazzType'], []));
              pickedClazz.totalFee = _.chain(clazzUtil.extractClazzPriceList(clazz)).head().get(['totalFee'], 0).value();

              return pickedClazz;
            }
        );
        // render数据
        return apiRender.renderBaseResult(res, pickedClazzes);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取课程详情
 * @param req
 * @param res
 */
pub.fetchClazz = (req, res) => {
  const currentClazz = req.__CURRENT_CLAZZ,
      clazzAccount = req.__CURRENT_CLAZZ_ACCOUNT;

  const clazzItem = _.pick(
      currentClazz,
      ['id', 'name', 'description', 'banner', 'clazzType', 'author', 'status', 'startDate', 'endDate', 'taskCount']),
      clazzConfig = _.pick(currentClazz.configuration, ['clazzType', 'taskCount','strategyLink']),
      clazzPriceList = clazzUtil.extractClazzPriceList(currentClazz);

  debug('#clazzConfig',clazzConfig);

  clazzConfig.clazzJoinType = clazzUtil.getClazzJoinType(clazzConfig.clazzType);

  const clazzInfo = _.extend(
      {},
      clazzConfig,
      {
        priceList: clazzPriceList,
        joinStatus: clazzAccount ? clazzAccount.status : ''
      },
      clazzItem);

  debug(clazzItem);

  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${ currentClazz.id }详情`, queryParam);

        // 获取加入班级人员数据
        return clazzAccountService.countClazzJoinedUser(currentClazz.id);
      })
      .then((joinedCount) => {
        clazzInfo.studentCount = joinedCount;

        return apiRender.renderBaseResult(res, clazzInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取课程攻略
 * @param req
 * @param res
 */
pub.fetchClazzStrategy = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${ req.__CURRENT_CLAZZ.id }攻略`, queryParam);

        // 获取班级介绍
        return req.__CURRENT_CLAZZ_INTRODUCTION;
      })
      .then((introductionItem) => {
        let strategyItem = _.pick(introductionItem, 'strategy');

        return apiRender.renderBaseResult(res, strategyItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取课程简介
 * @param req
 * @param res
 */
pub.fetchClazzIntroduction = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        let currentClazzItem = req.__CURRENT_CLAZZ;

        req.__MODULE_LOGGER(`获取课程${ currentClazzItem.id }简介`, queryParam);

        // todo: move to middleware
        // 自动加入
        if (_.isNil(req.__CURRENT_CLAZZ_ACCOUNT)) {
          clazzAccountService.userJoinClazz(req.__CURRENT_USER, currentClazzItem)
        }

        // 获取班级介绍
        return req.__CURRENT_CLAZZ_INTRODUCTION;
      })
      .then((introductionItem) => {
        let introduction = _.pick(introductionItem, 'introduction');

        return apiRender.renderBaseResult(res, introduction);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取客户付款方式
 * @param req
 * @param res
 */
pub.fetchClazzPayway = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        // 获取班级介绍
        return req.__CURRENT_CLAZZ_INTRODUCTION;
      })
      .then((introductionItem) => {
        let payway = _.pick(introductionItem, 'payway');

        return apiRender.renderBaseResult(res, payway);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取课程付款详情
 * @param req
 * @param res
 * @returns {*}
 */
pub.fetchClazzPayment = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ,
      userId = req.__CURRENT_USER.id;
  debug('#currentClazzItem',currentClazzItem);

  req.__MODULE_LOGGER('获取课程账单', currentClazzItem.id);

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const fetchCoinSumPromise = userCoinService.sumUserCoin(userId),
            fetchAvailableCouponListPromise = couponService.fetchAvailableCouponsList(userId),
            fetchPromotionOfferPromise = _.get(currentClazzItem, ['configuration', 'promotionOffer', 'isPromotion'], true)
                ? promotionService.fetchInviteePromotionOfferInfo(userId)
                : Promise.resolve({ promoterUser: null, joinedClazzCount: 1 }); // 如果当前班级不处于推广计划中，则直接诶返回

        return Promise.all([fetchCoinSumPromise, fetchAvailableCouponListPromise, fetchPromotionOfferPromise]);
      })
      .then(([coinCount, couponList, promotionOffer]) => {
        debug('#couponList',coinCount);
        debug('#couponList',couponList);
        debug('#promotionOffer',promotionOffer);

        // 修正： 优币总额小于0的情况
        const coinSum = _.max([coinCount, 0]),
            clazzPriceList = clazzUtil.extractClazzPriceList(currentClazzItem);

        debug(coinSum);
        debug(clazzPriceList);

        _.forEach(clazzPriceList, (clazzPrice) => {
          // 确保价格存在
          if (!_.isSafeInteger(clazzPrice.totalFee)) {
            clazzPrice.totalFee = 0;
          }
          if (!_.isSafeInteger(clazzPrice.originFee)) {
            clazzPrice.originFee = clazzPriceList.totalFee;
          }

          // 班级费用，单位：元
          const clazzFee = clazzPrice.totalFee / 100;

          // 获取小于班级费用的最大优惠券
          const couponItem = _.chain(couponList)
              .filter((coupon) => coupon.money <= clazzFee)
              .maxBy('money')
              .value();

          debug(couponItem);

          // 优惠券金额
          const couponMoney = _.isNil(couponItem) ? 0 : couponItem.money;
          // 用户优惠券
          clazzPrice.coupon = _.isNil(couponItem) ? null : _.pick(couponItem, ['id', 'money']);
          // 用户优币可用额度
          clazzPrice.coin = {
            max: _.min([coinSum, _.floor(clazzFee)]),
            min: _.min([coinSum, _.floor(clazzFee - couponMoney)])
          };
        });

        // 推广者信息
        const pickedPromotionUserInfo = apiUtil.pickPromotionUserBasicInfo(
            promotionOffer.promoterUser,
            wechatPromotion.getWechatQrCodeUrlByTicket
        );

        return apiRender.renderBaseResult(res, {
          clazz: apiUtil.pickClazzBasicInfo(currentClazzItem),
          clazzConfiguration: _.pick(currentClazzItem,['configuration'],{}),                                         // 班级信息
          clazzAccount: _.pick(req.__CURRENT_CLAZZ_ACCOUNT, ['id', 'status', 'endDate'], null), // 班级账户信息
          priceList: clazzPriceList,                                                            // 账单列表
          promotionOffer: {
            offerPrice: _.get(currentClazzItem, ['configuration', 'promotionOffer', 'firstOffer'], 0),
            joinedClazzCount: promotionOffer.joinedClazzCount,
            promotionUserInfo: pickedPromotionUserInfo
          }
        });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 学员加入班级预处理方法 -- 此时未付款
 * 1. 创建clazzAccount记录
 * 2. 构建课程支付账单
 * 3. 生成支付记录
 *
 * @param req
 * @param res
 */
pub.preProcessClazzPayment = (req, res) => {
  const clazzItem = req.__CURRENT_CLAZZ;
  return schemaValidator.validatePromise(clazzSchema.clazzPaymentBodySchema, req.body)
      .then((clazzBill) => {
        debug(clazzBill);

        req.__MODULE_LOGGER('预备课程付款', clazzBill);

        return wechatPayment.clazzPaymentHandlerFactory(clazzItem.clazzType)(
            clazzBill,
            clazzItem,
            req.__CURRENT_USER,
            req.__CURRENT_CLAZZ_ACCOUNT
        );
      })
      .then((result) => {
        result.clazzInfo = apiUtil.pickClazzBasicInfo(clazzItem);

        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 检查当前用户是否为课程笃师
 * @param req
 * @param res
 * @returns {*}
 */
pub.checkIsTeacher = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        return apiRender.renderBaseResult(res, req.__IS_CURRENT_CLAZZ_TEACHER);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户退出班级
 *
 * @param req
 * @param res
 */
pub.userQuitClazz = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const clazzJoinType = clazzUtil.getClazzJoinType(_.get(req.__CURRENT_CLAZZ, 'configuration.clazzType', []));

        // 暂只支持 免费班
        if (clazzJoinType !== enumModel.clazzJoinTypeEnum.FREE.key) {
          throw commonError.PARAMETER_ERROR('该班级暂不支持该功能');
        }

        return clazzAccountService.update({
          id: req.__CURRENT_CLAZZ_ACCOUNT.id,
          status: enumModel.clazzJoinStatusEnum.CANCELED.key
        });
      })
      .then((updatedClazzAccountItem) => {
        debug(updatedClazzAccountItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 新建学员退班记录
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.createClazzExitItem = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.clazzExitSchema, req.body)
      .then((clazzExit) => {
        debug(clazzExit);

        const userId = req.__CURRENT_USER.id,
            clazzId = clazzExit.clazzId,
            userReason = clazzExit.reason;

        // 查询班级
        const fetchClazzPromise = clazzService.fetchClazzById(clazzId);
        // 查询班级账户信息
        const fetchClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(clazzId, userId);

        return Promise.all([fetchClazzPromise, fetchClazzAccountPromise])
            .then(([clazzItem, clazzAccountList]) => {
              const clazzAccountItem = _.first(clazzAccountList);

              debug(clazzItem);
              debug(clazzAccountItem);

              // 如果不存在
              if (_.isNil(clazzItem) || _.isNil(clazzAccountItem)) {
                return Promise.reject(commonError.PARAMETER_ERROR());
              }

              const clazzAccountStatus = _.get(clazzAccountItem, ['status'], null);
              // 如果非进行中
              debug(clazzAccountStatus);
              if (clazzAccountStatus !== enumModel.clazzJoinStatusEnum.PROCESSING.key && clazzAccountStatus !== enumModel.clazzJoinStatusEnum.WAITENTER.key) {
                return Promise.reject(commonError.BIZ_FAIL_ERROR('当前状态不允许退班！'));
              }


              // 如果距离开班大于了3天，不允许退班
              const openDate = moment(clazzItem['startDate']).add(2,'days').endOf('day');
              const now = moment();
              if(openDate.diff(now) < 0){
                return Promise.reject(commonError.BIZ_FAIL_ERROR('开班三天后不允许退班！'));
              }

              // 计算学分
              return clazzAccountService.calculateClazzScore(clazzItem, clazzAccountItem)
                  .then((clazzScore) => {
                    debug(clazzScore);

                    const CHECKIN_RPICE = 6;
                    const taskCount = clazzUtil.getClazzTaskCount(clazzItem);

                    // A = clazzScore.tasks - clazzScore.finishedTasks ： 未打卡数量
                    // B = taskCount - A : 应退款任务数
                    // CHECKIN_RPICE * B : 退款总额
                    const userCoins = CHECKIN_RPICE * (taskCount - (clazzScore.tasks - clazzScore.finishedTasks));

                    return clazzExitService.createClazzExit(userId, clazzId, clazzAccountItem.id, userCoins, userReason);
                  });
            });
      })
      .then((clazzExitItem) => {
        debug(clazzExitItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
