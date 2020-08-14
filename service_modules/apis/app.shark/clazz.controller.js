'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const winston = require('winston');
const moment = require('moment');

const systemConfig = require('../../../config/config');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const wechatPromotion = require('../../lib/wechat.promotion');
const cacheWrapper = require('../../services/component/cacheWrap.component');

const clazzService = require('../../services/clazz.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const userCoinService = require('../../services/userCoin.service');
const ubandCoinService = require('../../services/ubandCoin.service');
const couponService = require('../../services/coupon.service');
const promotionService = require('../../services/promotion.service');
const ubandAdvertiseService = require('../../services/ubandAdvertise.service');

const apiUtil = require('../util/api.util');
const clazzUtil = require('../../services/util/clazz.util');
const taskUtil = require('../../services/util/task.util');

const wechatPayment = require('../../lib/wechat.payment');
const alipayPayment = require('../../lib/alipay/alipay.payment');

const pub = {};

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
        let countPromise = cacheWrapper.get('CLAZZ_USER_NUMBER');

        // 2. 根据status的不同调用不同的service方法，他们均返回课程列表
        if (queryParams.status === enumModel.clazzStatusEnum.OPEN.key) {
          req.__MODULE_LOGGER('获取报名课程列表', queryParams);

          // 如果只看开放的课程，直接返回了
          let clazzListPromise =  clazzService.queryClazzes(queryParams.status, null, null, null)
              .then((clazzList) => {
                let newClazzList = _.filter(clazzList, clazzUtil.checkIsClazzShow);
                return newClazzList;
              });

          return Promise.all([clazzListPromise, countPromise]);

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

        let  clazzListPromise = clazzAccountService.queryUserClazzByStatus(CURRENT_USER, joinStatus, queryParams.isCheckinable)
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

        return Promise.all([clazzListPromise, countPromise]);
      })
      .then(([clazzList,countMap]) => {
        // 筛选数据
        if(countMap == null){
          countMap = {};
        }
        const pickedClazzes = _.map(
            clazzList,
            (clazz) => {
              const pickedClazz = _.pick(clazz, ['id', 'name', 'description', 'status', 'banner','smallBanner', 'startDate', 'endDate', 'author', 'hasCheckin','studentCount']);
              pickedClazz.clazzJoinType = clazzUtil.getClazzJoinType(_.get(clazz, ['configuration', 'clazzType'], []));
              pickedClazz.totalFee = _.chain(clazzUtil.extractClazzPriceList(clazz)).head().get(['totalFee'], 0).value();

              let count = countMap[clazz.id] ? countMap[clazz.id].count: 0;
              pickedClazz['studentCount'] = count;
              return pickedClazz;
            }
        );
        // render数据
        return apiRender.renderBaseResult(res, pickedClazzes);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取课程简介
 * @param req
 * @param res
 */
pub.fetchClazzIntroduction = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ,
      currentClazzAccountItem = req.__CURRENT_CLAZZ_ACCOUNT;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${ currentClazzItem.id }简介`, queryParam);

        // 获取课程简介
        const introduction = _.get(req.__CURRENT_CLAZZ_INTRODUCTION, 'introduction');

        const parseIntroductionPromise = taskUtil.parseHtmlToListPromise(introduction);

        // 获取加入班级人员数据
        const countClazzJoinedPromise = clazzAccountService.countClazzJoinedUser(currentClazzItem.id);

        return Promise.all([countClazzJoinedPromise, parseIntroductionPromise]);
      }).then(([joinedCount, clazzIntroductionList]) => {
        const clazzItem = _.pick(
            currentClazzItem,
            ['id', 'name', 'description', 'banner', 'clazzType', 'author', 'status', 'taskCount']
            ),
            clazzConfig = _.pick(currentClazzItem.configuration, ['clazzType', 'taskCount']),
            clazzPriceList = clazzUtil.extractClazzPriceList(currentClazzItem);

        debug(clazzItem);

        clazzConfig.clazzJoinType = clazzUtil.getClazzJoinType(clazzConfig.clazzType);

        const clazzInfo = _.extend(
            {},
            clazzConfig,
            clazzItem,
            {
              priceList: clazzPriceList,
              joinStatus: currentClazzAccountItem ? currentClazzAccountItem.status : '',
              introduction: clazzIntroductionList,
              studentCount: joinedCount,
              startDate: moment(currentClazzItem.startDate).format('YYYY-MM-DD'),
              endDate: moment(currentClazzItem.endDate).format('YYYY-MM-DD')
            }
        );

        debug(clazzConfig);

        return apiRender.renderBaseResult(res, clazzInfo);
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
  debug(currentClazzItem);

  req.__MODULE_LOGGER('获取课程账单', currentClazzItem.id);

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const fetchCoinSumPromise = userCoinService.sumUserCoin(userId),
            fetchUbandCoinSumPromise = ubandCoinService.sumUbandCoins(userId),
            fetchAvailableCouponListPromise = couponService.fetchAvailableCouponsList(userId),
            fetchPromotionOfferPromise = _.get(currentClazzItem, ['configuration', 'promotionOffer', 'isPromotion'], true)
                ? promotionService.fetchInviteePromotionOfferInfo(userId)
                : Promise.resolve({ promoterUser: null, joinedClazzCount: 1 }); // 如果当前班级不处于推广计划中，则直接诶返回

        return Promise.all([fetchCoinSumPromise, fetchUbandCoinSumPromise, fetchAvailableCouponListPromise, fetchPromotionOfferPromise]);
      })
      .then(([coinCount, ubandCoinCount, couponList, promotionOffer]) => {
        debug(coinCount);
        debug(ubandCoinCount);
        debug(couponList);
        debug(promotionOffer);

        // 修正： 优币总额小于0的情况
        const coinSum = _.max([coinCount, 0]),
            ubandCoinSum = _.max([ubandCoinCount, 0]),
            clazzPriceList = clazzUtil.extractClazzPriceList(currentClazzItem);

        debug(coinSum);
        debug(ubandCoinSum);
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

          clazzPrice.ubandCoin = {
            max: _.min([ubandCoinSum, _.floor(clazzPrice.totalFee)]),
            min: _.min([ubandCoinSum, _.floor(clazzPrice.totalFee - couponMoney * 100)])
          }
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
  const currentClazzItem = req.__CURRENT_CLAZZ;

  return schemaValidator.validatePromise(clazzSchema.clazzPaymentBodySchema, req.body)
      .then((clazzBill) => {
        debug(clazzBill);

        req.__MODULE_LOGGER('预备课程付款', clazzBill);

        const clazzType = _.get(currentClazzItem, 'clazzType');

        let clazzPaymentHandler;
        switch (clazzBill.payway) {
          case enumModel.payWayEnum.wechat_uband_app.key:
            clazzPaymentHandler = wechatPayment.appClazzPaymentHandlerFactory(clazzType);
            break;
          case enumModel.payWayEnum.alipay_uband_app.key:
            clazzPaymentHandler = alipayPayment.appClazzPaymentHandlerFactory(clazzType);
            break;
          default:
            return Promise.reject("不支持的付款方式")
        }

        return clazzPaymentHandler(clazzBill, currentClazzItem, req.__CURRENT_USER, req.__CURRENT_CLAZZ_ACCOUNT);
      })
      .then((result) => {
        result.clazzInfo = apiUtil.pickClazzBasicInfo(currentClazzItem);

        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 * 获取banner和图片
 *
 * @从开放报名的课程当中选择两门课程配置Banner宣传
 * @type {{}}
 */
pub.getAppActiveBanner = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        return ubandAdvertiseService.queryUbandBanner();
      }).then((banners)=>{
        return apiRender.renderBaseResult(res, banners);
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 * 获取一些热门的课程
 *
 * @从开放报名的课程中选择热门课程显示
 * @type {{}}
 */
pub.getHotClazzList = (req, res) =>{
  //目前的策略就是给课程加一个字段，还是用获取课程列表的sevice
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam)=>{

        let countPromise = cacheWrapper.get('CLAZZ_USER_NUMBER');

        let clazzPromise = clazzService.queryClazzes(enumModel.clazzStatusEnum.OPEN.key, null, null, null)
            .then((clazzList) => {
              let newClazzList = _.filter(clazzList, clazzUtil.checkIsClazzShow);

              let finalClazzList= _.filter(newClazzList, clazzUtil.checkIsClazzHot);

              return finalClazzList;
            });

        return Promise.all([clazzPromise, countPromise]);
      })
      .then(([finalList, countMap])=>{
        if(countMap == null){
          countMap = {};
        }
        debug("=== COUNT MAP ===");
        debug(countMap);

        const pickedClazzes = _.map(finalList, (item) =>{
          const pickedClazz = _.pick(item, ['id', 'name', 'description', 'status', 'banner', 'smallBanner', 'startDate', 'endDate', 'author', 'hasCheckin','studentCount']);
          pickedClazz.clazzJoinType = clazzUtil.getClazzJoinType(_.get(item, ['configuration', 'clazzType'], []));
          pickedClazz.totalFee = _.chain(clazzUtil.extractClazzPriceList(item)).head().get(['totalFee'], 0).value();
          let count = countMap[item.id] ? countMap[item.id].count: 0;
          pickedClazz['studentCount'] = count;
          return pickedClazz;
        });

        return apiRender.renderBaseResult(res, pickedClazzes);
      })
      .catch(req.__ERROR_HANDLER);
};



module.exports = pub;
