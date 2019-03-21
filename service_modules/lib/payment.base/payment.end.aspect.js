'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const moment = require('moment');
const Promise = require('bluebird');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const wechatTemplateReply = require('../wechat.template.reply');
const wechatPromotion = require('../wechat.promotion');

const couponService = require('../../services/coupon.service');
const userCoinService = require('../../services/userCoin.service');
const ubandCoinService = require('../../services/ubandCoin.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const promotionService = require('../../services/promotion.service');

const clazzUtil = require('../../services/util/clazz.util');

const pub = {};

const CHECK_COUPON_ERROR_MSG = '优惠券信息有误';
const CHECK_COIN_ERROR_MSG = '优币不足';
const BILL_MONEY_MISMATCH_ERROR_MSG = '订单金额不匹配,请重新报名!';

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
      defaultValidResolveResult = { isValid: true, money: 0 },
      promotionCode = _.get(bill, 'promotionCode', null);

  debug(isCouponSelected);
  debug(couponId);
  debug(isCoinSelected);
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

  return Promise.all([checkCouponPromise, checkCoinPromise, checkPromotionCodePromise])
      .then(([isCouponValidResult, isCoinSufficientResult, isPromotionCOdeValidResult]) => {
        debug(isCouponValidResult);
        debug(isCoinSufficientResult);
        debug(isPromotionCOdeValidResult);

        if (isCouponValidResult.isValid !== true) {
          result.message = CHECK_COUPON_ERROR_MSG;
          return Promise.reject(commonError.PARAMETER_ERROR(CHECK_COUPON_ERROR_MSG));
        }

        if (isCoinSufficientResult.isValid !== true) {
          result.message = CHECK_COIN_ERROR_MSG;
          return Promise.reject(commonError.PARAMETER_ERROR(CHECK_COIN_ERROR_MSG));
        }

        if (isPromotionCOdeValidResult.isValid !== true) {
          result.message = isPromotionCOdeValidResult.message;
          return Promise.reject(commonError.PARAMETER_ERROR(isPromotionCOdeValidResult.message));
        }

        const userChosenClazzPrice = _.keyBy(clazzUtil.extractClazzPriceList(clazzItem), 'name')[bill.priceItemName];

        debug(userChosenClazzPrice);

        if (!_.isPlainObject(userChosenClazzPrice) || userChosenClazzPrice.months !== bill.months) {
          result.isValid = false;
          result.message = BILL_MONEY_MISMATCH_ERROR_MSG;

          throw commonError.PARAMETER_ERROR(BILL_MONEY_MISMATCH_ERROR_MSG);
        }

        // 计算金额是否吻合，先转换为整数，再比较
        const clazzDiscount = _.get(clazzItem, 'configuration.discount', 1),
            // 减免的钱币 优币 + 优惠券 + 推广优惠
            billMinusMoney = isCouponValidResult.money + isCoinSufficientResult.money + isPromotionCOdeValidResult.money;

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

/**
 * 用户支付课程完成后的统一处理
 * 1. 设置clazz_account状态
 * 2. 通知用户
 * 3. 使用优惠券
 * 4. 使用优币
 *
 * @param user
 * @param clazz
 * @param clazzAccount
 * @param bill
 * @param userPay
 */
pub.clazzPayEndAspect = (user, clazz, clazzAccount, bill, userPay) => {
  const updateClazzAccountAndNotifyUser = (toUpdateClazzAccount) => {
    // 保存clazzAccount
    clazzAccountService.update(toUpdateClazzAccount)
        .catch((error) => {
          winston.error('[clazz_account_save_fail] : %j', toUpdateClazzAccount);

          winston.error(error);
        });

    // 发送客服消息
    wechatTemplateReply.sendJoinSuccessMsg(user, clazz)
        .catch((error) => {
          winston.error('[send_user_join_msg_fail]');

          winston.error(error);
        });
  };

  // 1. 使用 coupon
  // 2. 使用 优币
  // 3. 使用 推广优惠码
  if (bill) {
    const clazzJoinDate = _.get(clazzAccount, 'joinDate', new Date());
    /**
     * 长期班 1. 增加record 2. 更新clazz_account
     * 其他班 1. 更新clazz_account
     */
    if (clazz.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key) {
      const billMonths = _.get(bill, 'months', 0);

      if (_.isSafeInteger(billMonths) && billMonths >= 0) {
        clazzAccountService.queryClazzAccountRecords(clazzAccount)
            .then((clazzAccountRecordList) => {
              // 取当天与课程开始日期中的大值的前一天
              const lastRecordEndDate = moment.max(moment(), moment(clazz.startDate)).add(-1, 'day').endOf('day').toDate();

              // 使用 endDate 为 yesterdayEndDate 的 虚拟clazzAccountRecord 条目，来统一获取课程最大结束日期获取方式
              const maxEndDate = _.chain(_.flatten([clazzAccountRecordList, { endDate: lastRecordEndDate }]))
                  .maxBy('endDate')
                  .get('endDate')
                  .value();

              const recordStartDate = moment(maxEndDate).add(1, 'day').startOf('day').toDate(),
                  recordEndDate = billMonths === 0
                      ? moment(maxEndDate).add(1, 'day').endOf('day').toDate()
                      : moment(maxEndDate).add(billMonths, 'month').endOf('isoweek').toDate();

              const newClazzAccountRecord = {
                bill: JSON.stringify(bill),
                startDate: recordStartDate,
                endDate: recordEndDate
              };

              clazzAccountService.createClazzAccountRecord(clazzAccount, newClazzAccountRecord)
                  .catch((error) => {
                    winston.error('[clazz_account_record_save_fail] : %j', newClazzAccountRecord);

                    winston.error(error);
                  });

              updateClazzAccountAndNotifyUser({
                id: clazzAccount.id,
                status: enumModel.clazzJoinStatusEnum.WAITENTER.key,
                joinDate: clazzJoinDate,
                endDate: recordEndDate
              });
            })
            .catch((error) => {
              winston.error('[query_clazz_account_records_fail] clazzAccount : %j', clazzAccount);

              winston.error(error);
            });
      }
    } else {
      updateClazzAccountAndNotifyUser({
        id: clazzAccount.id,
        status: enumModel.clazzJoinStatusEnum.WAITENTER.key,
        joinDate: clazzJoinDate
      });
    }

    const isCouponSelected = _.get(bill, 'coupon.selected', false),
        couponId = _.get(bill, 'coupon.id', null),
        isCoinSelected = _.get(bill, 'coin.selected', false),
        usedCoin = _.get(bill, 'coin.coin', 0),
        isUbandcoinSelected = _.get(bill, 'ubandCoin.selected', false),
        usedUbandcoin = _.get(bill, 'ubandCoin.coin', 0),
        promotionCode = _.get(bill, 'promotionCode', null);

    debug(isCouponSelected);
    debug(couponId);
    debug(isCoinSelected);
    debug(usedCoin);
    debug(isUbandcoinSelected);
    debug(usedUbandcoin);
    debug(promotionCode);

    // 更新 coupon
    if (isCouponSelected) {
      const toUpdateCoupon = {
        id: couponId,
        status: enumModel.couponStatusEnum.USED.key
      };

      debug(toUpdateCoupon);

      // 更新coupon
      couponService.updateCoupon(toUpdateCoupon)
          .catch((error) => {
            winston.error('[user_coupon_used_error] : %j', bill);
            winston.error(error);
          })
    }

    // 更新 优币
    if (isCoinSelected && usedCoin > 0) {
      const coinItem = {
        userId: user.id,
        coinChange: -usedCoin,
        remark: clazz.name,
        title: enumModel.coinBizTypeEnum.CLAZZSTART.name,
        bizType: enumModel.coinBizTypeEnum.CLAZZSTART.key,
        bizId: clazzAccount.id,
        changeDate: new Date()
      };

      // 更新优币
      userCoinService.createUserCoin(coinItem)
          .catch((error) => {
            winston.error('[user_coin_used_error] : %s', ca.id);
            winston.error(error);
          });
    }

    // 使用 友币
    if (isUbandcoinSelected && usedUbandcoin > 0) {
      ubandCoinService.costUbandCoin(user.id, usedUbandcoin, `加入${ clazz.name }，支付${usedUbandcoin}`)
    }

    // 使用优惠码
    if (!_.isNil(promotionCode)) {
      wechatPromotion.promotionClazzPaymentHandler(promotionCode, user, clazz, userPay)
          .catch(winston.error);
    }
  }
};

module.exports = pub;
