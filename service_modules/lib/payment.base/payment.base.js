'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const Promise = require('bluebird');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const couponService = require('../../services/coupon.service');
const userCoinService = require('../../services/userCoin.service');
const ubandCoinService = require('../../services/ubandCoin.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const promotionService = require('../../services/promotion.service');

const clazzUtil = require('../../services/util/clazz.util');

const pub = {};

const CHECK_COUPON_ERROR_MSG = '优惠券信息有误';
const CHECK_COIN_ERROR_MSG = '优币不足';
const CHECK_UBAND_COIN_ERROR_MSG = '友币不足';
const BILL_MONEY_MISMATCH_ERROR_MSG = '订单金额不匹配,请重新报名!';

/**
 * 初始化账单结果
 *
 * @returns {{success: boolean, payData: {}, message: string, signData: {}}}
 */
pub.initializePayResult = () => {
  return {
    success: false,
    payData: {},
    message: '',
    signData: {}
  };
};

/**
 * 账单是否合法
 *
 * @param bill
 * @param userItem
 * @param clazzItem
 * @returns {Promise|Promise.<TResult>}
 */
pub.isBillValid = (bill, userItem, clazzItem) => {
  const result = {
    isValid: true,
    message: ''
  };

  const userId = userItem.id,
      isCouponSelected = _.get(bill, 'coupon.selected', false),
      couponId = _.get(bill, 'coupon.id', null),
      isCoinSelected = _.get(bill, 'coin.selected', false),
      usedCoin = _.get(bill, 'coin.coin', 0),
      isUbandcoinSelected = _.get(bill, 'ubandCoin.selected', false),
      usedUbandcoin = _.get(bill, 'ubandCoin.coin', 0),
      defaultValidResolveResult = { isValid: true, money: 0 },
      promotionCode = _.get(bill, 'promotionCode', null);

  debug(isCouponSelected);
  debug(couponId);
  debug(isCoinSelected);
  debug(isUbandcoinSelected);
  debug(usedCoin);
  debug(defaultValidResolveResult);

  //1. 是否使用优惠券
  const checkCouponPromise = isCouponSelected === true
      ? couponService.fetchCouponById(couponId)
          .then((coupon) => {
            debug(coupon);
            //1.1 判断是否是本人 && 判断是否是还未使用
            if (userId === coupon.userId && coupon.status === enumModel.couponStatusEnum.AVAILABLE.key) {
              return {
                isValid: true,
                money: coupon.money * 100 // 单位分
              };
            } else {
              result.isValid = false;
              result.message = CHECK_COUPON_ERROR_MSG;

              throw commonError.PARAMETER_ERROR(CHECK_COUPON_ERROR_MSG);
            }
          })
      : Promise.resolve(defaultValidResolveResult);

  // 2. 判断优币是否够用
  const checkCoinPromise = (isCoinSelected && usedCoin !== 0)
      // 获取用户优币总额
      ? userCoinService.sumUserCoin(userId)
          .then((userCoinSum) => {
            debug(userCoinSum);
            // 2.2. 判断甘比余额
            if (userCoinSum >= usedCoin) {
              return {
                isValid: true,
                money: usedCoin * 100 // 单位分
              };
            } else {
              result.isValid = false;
              result.message = CHECK_COIN_ERROR_MSG;

              throw commonError.PARAMETER_ERROR(CHECK_COIN_ERROR_MSG);
            }
          })
      : Promise.resolve(defaultValidResolveResult);

  const checkUbandCoinPromise = (isUbandcoinSelected && usedUbandcoin !== 0)
      ? ubandCoinService.sumUbandCoins(userId)
          .then((ubandcoinSum) => {
            debug(ubandcoinSum);

            if (ubandcoinSum >= usedUbandcoin) {
              return {
                isValid: true,
                money: usedUbandcoin // 单位：分
              }
            } else {
              result.isValid = false;
              result.message = CHECK_UBAND_COIN_ERROR_MSG;

              throw commonError.PARAMETER_ERROR(CHECK_UBAND_COIN_ERROR_MSG);
            }
          })
      : Promise.resolve(defaultValidResolveResult);

  // 检查优惠券
  const checkPromotionCodePromise = _.isNil(promotionCode)
      ? Promise.resolve(defaultValidResolveResult)
      : Promise.all([
            promotionService.fetchPromotionUserByPromotionCode(promotionCode),
            clazzAccountService.countUserJoinedPromotionClazzes(userId)
          ])
          .then(([promotionUser, joinedClazzCount]) => {
            if (joinedClazzCount > 0) {
              result.isValid = false;
              result.message = '非首单不能使用优惠码';

              return Promise.reject(commonError.PARAMETER_ERROR('非首单不能使用优惠码'));
            }

            if (_.isNil(promotionUser)) {
              result.isValid = false;
              result.message = '不存在的优惠码';

              return Promise.reject(commonError.PARAMETER_ERROR('不存在的优惠码'));
            }

            const isPromotionClazz = _.get(clazzItem, ['configuration', 'promotionOffer', 'isPromotion'], true);
            // 如果班级未设置推广计划，则报错
            if (isPromotionClazz !== true) {
              result.isValid = false;
              result.message = '该班级不能使用优惠码';

              return Promise.reject(commonError.PARAMETER_ERROR('该班级不能使用优惠码'));
            }

            return {
              isValid: true,
              money: _.get(clazzItem, ['configuration', 'promotionOffer', 'firstOffer'], 0) // 单位分
            };
          });

  return Promise.all([checkCouponPromise, checkCoinPromise, checkUbandCoinPromise, checkPromotionCodePromise])
      .then(([isCouponValidResult, isCoinSufficientResult, isUbandcoinSufficientResult, isPromotionCOdeValidResult]) => {
        debug(isCouponValidResult);
        debug(isCoinSufficientResult);
        debug(isUbandcoinSufficientResult);
        debug(isPromotionCOdeValidResult);

        if (isCouponValidResult.isValid !== true) {
          result.message = CHECK_COUPON_ERROR_MSG;
          return Promise.reject(commonError.PARAMETER_ERROR(CHECK_COUPON_ERROR_MSG));
        }

        if (isCoinSufficientResult.isValid !== true) {
          result.message = CHECK_COIN_ERROR_MSG;
          return Promise.reject(commonError.PARAMETER_ERROR(CHECK_COIN_ERROR_MSG));
        }

        if (isUbandcoinSufficientResult.isValid !== true) {
          result.message = CHECK_UBAND_COIN_ERROR_MSG;
          return Promise.reject(commonError.PARAMETER_ERROR(CHECK_UBAND_COIN_ERROR_MSG));
        }

        if (isPromotionCOdeValidResult.isValid !== true) {
          result.message = isPromotionCOdeValidResult.message;
          return Promise.reject(commonError.PARAMETER_ERROR(isPromotionCOdeValidResult.message));
        }

        const userChosenClazzPrice = _.keyBy(clazzUtil.extractClazzPriceList(clazzItem), 'name')[bill.priceItemName];

        debug("用户选择课程的价格");
        debug(bill.priceItemName);
        debug(userChosenClazzPrice);

        if (!_.isPlainObject(userChosenClazzPrice) || userChosenClazzPrice.months !== bill.months) {
          result.isValid = false;
          result.message = BILL_MONEY_MISMATCH_ERROR_MSG;

          throw commonError.PARAMETER_ERROR(BILL_MONEY_MISMATCH_ERROR_MSG);
        }

        // 计算金额是否吻合，先转换为整数，再比较
        const clazzDiscount = _.get(clazzItem, 'configuration.discount', 1),
            // 减免的钱币 优币 + 友币 + 优惠券 + 推广优惠
            billMinusMoney = isCouponValidResult.money + isCoinSufficientResult.money + isUbandcoinSufficientResult.money + isPromotionCOdeValidResult.money;

        debug(clazzDiscount);
        debug(billMinusMoney);

        const payMoney = _.max([_.toInteger(userChosenClazzPrice.totalFee * clazzDiscount - billMinusMoney), 0]),
            billMoney = _.toInteger(bill.money);

        debug(payMoney);
        debug(billMoney);

        if (billMoney !== payMoney) {
          result.isValid = false;
          result.message = BILL_MONEY_MISMATCH_ERROR_MSG;

          throw commonError.PARAMETER_ERROR(BILL_MONEY_MISMATCH_ERROR_MSG);
        }

        debug(result);
        return result;
      })
      .catch((error) => {
        winston.error('账单校验失败！！！Error: %j', error);

        const message = result.message || '账单校验失败';

        winston.error('订单不合法： %s', message);

        return Promise.reject(commonError.PARAMETER_ERROR(message));
      });
};

module.exports = pub;
