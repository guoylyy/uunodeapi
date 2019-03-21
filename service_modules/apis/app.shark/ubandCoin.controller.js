'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const schemaValidator = require('../schema.validator');
const apiRender = require('../render/api.render');

const commonSchema = require('../common.schema');
const accountSchema = require('./schema/account.schema');

const apiUtil = require('../util/api.util');

const appleIapComponent = require('../../lib/iap.apple/iap.payment');
const paymentBase = require('../../lib/payment.base/payment.base');
const paymentEndAspect = require('../../lib/payment.base/payment.end.aspect');

const clazzService = require('../../services/clazz.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const ubandCoinService = require('../../services/ubandCoin.service');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const pub = {};

pub.redeemUbandCoin = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.redeemUbandCoinSchema, req.body)
      .then((redeem) => {
        return apiRender.renderBaseResult(res, redeem.redeem === "whoisyourdaddy");
      })
      .catch(req.__ERROR_HANDLER);
};

pub.queryAvailableIapProducts = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        return appleIapComponent.supportedIapProductList();
      })
      .then((productList) => {
        return apiRender.renderBaseResult(res, productList);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.queryUbandCoins = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return ubandCoinService.sumUbandCoins(req.__CURRENT_USER.id);
      })
      .then((coinSum) => {
        return apiRender.renderBaseResult(res, { sum: coinSum, history: [] });
      })
      .catch(req.__ERROR_HANDLER);
};

pub.paidIapProduct = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.ubandCoinSchema, req.body)
      .then((iapReceipt) => {
        debug(iapReceipt);

        return appleIapComponent.validateIap(iapReceipt.receipt)
            .then((purchaseList) => {
              debug(purchaseList);
              // 检查是否都未处理
              const transactionIds = _.map(purchaseList, 'transactionId');
              debug(transactionIds);

              return ubandCoinService.isTransactionIdsExisted(transactionIds)
                  .then((isAnyExisted) => {
                    debug(isAnyExisted);

                    if (isAnyExisted) {
                      return Promise.reject(commonError.BIZ_FAIL_ERROR("账单处理失败"));
                    }

                    const promiseList = _.map(
                        purchaseList,
                        purchase => ubandCoinService.createUbandCoin(
                            req.__CURRENT_USER.id,
                            appleIapComponent.calculateCoins(purchase),
                            purchase
                        ));

                    return Promise.all(promiseList);
                  })
            });
      })
      .then((productList) => {
        debug(productList);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.paidClazzItem = (req, res) => {
  let currentClazzItem = null;

  return schemaValidator.validatePromise(accountSchema.useUbandCoinSchema, req.body)
      .then((clazzBill) => {
        debug(clazzBill);

        const clazzId = clazzBill.clazzId;

        const fetchClazzPromise = clazzService.fetchClazzById(clazzId);
        const fetchClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(clazzId, req.__CURRENT_USER.id);

        return Promise.all([fetchClazzPromise, fetchClazzAccountPromise])
            .then(([clazzItem, [clazzAccountItem]]) => {
              debug(clazzItem);
              debug(clazzAccountItem);

              // 验证班级是否存在
              if (_.isNil(clazzItem)) {
                return Promise.reject(commonError.NOT_FOUND_ERROR("不存在的班级"));
              }
              currentClazzItem = clazzItem;

              // 验证课程是否已经开放报名
              if (clazzItem.clazzType !== enumModel.clazzTypeEnum.LONG_TERM.key) {
                if (clazzItem.status !== enumModel.clazzStatusEnum.OPEN.key) {
                  return Promise.reject(commonError.PARAMETER_ERROR('课程未开放'));
                }

                // 是否已经加入班级
                if (!_.isNil(clazzAccountItem) && !_.includes(
                        [enumModel.clazzJoinStatusEnum.PAYING.key, enumModel.clazzJoinStatusEnum.INVITATION.key, enumModel.clazzJoinStatusEnum.CANCELED.key],
                        clazzAccountItem.status
                    )) {
                  return {
                    action: enumModel.clazzPaymentResultEnum.ALREADY_JOIN.key,
                    // 签名信息为空
                    signData: {}
                  };
                }
              }

              // 检查是否已存在帐号
              const createClazzAccountPromise = _.isNil(clazzAccountItem)
                  ? clazzAccountService.userJoinClazz(req.__CURRENT_USER, clazzItem)
                  : Promise.resolve(clazzAccountItem);

              const isPaymentValidPromise = paymentBase.isBillValid(clazzBill, req.__CURRENT_USER, clazzItem);

              return Promise.all([createClazzAccountPromise, isPaymentValidPromise])
                  .then(([clazzAccountItem, checkResult]) => {
                    debug(clazzAccountItem);
                    debug(checkResult);

                    paymentEndAspect.clazzPayEndAspect(req.__CURRENT_USER, clazzItem, clazzAccountItem, clazzBill, null);

                    return clazzAccountService.update({ id: clazzAccountItem.id, bill: JSON.stringify(clazzBill) })
                        .then((updatedClazzAccount) => {
                          debug(updatedClazzAccount);

                          return {
                            action: enumModel.clazzPaymentResultEnum.SUCCESS.key,
                            // 签名信息为空
                            signData: {}
                          }
                        });
                  })
            });
      })
      .then((result) => {
        debug(result);

        result.clazzInfo = apiUtil.pickClazzBasicInfo(currentClazzItem);

        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
