"use strict";

const debug = require('debug')('lib');
const winston = require('winston');
const iap = require('in-app-purchase');
const Promise = require('bluebird');

const systemConfig = require('../../../config/config');
const commonError = require('../../services/model/common.error');

iap.config(systemConfig.APPLE_IAP_CONFIG);

const pub = {};

pub.supportedIapProductList = () => {
  return Promise.resolve([{
    productId: "mianlikeji.uband.iap.ubandcoin50",
    productName: "友币50",
    displayName: "友币50枚",
    description: "友班友币50枚虚拟货币"
  }, {
    productId: "mianlikeji.uband.iap.ubandcoin98",
    productName: "友币98",
    displayName: "友币98枚",
    description: "友班友币98枚虚拟货币"
  }, {
    productId: "mianlikeji.uband.iap.ubandcoin298",
    productName: "友币298",
    displayName: "友币298枚",
    description: "友班友币298枚虚拟货币"
  }, {
    productId: "mianlikeji.uband.iap.ubandcoin488",
    productName: "友币488",
    displayName: "友币488枚",
    description: "友班友币488枚虚拟货币"
  }]);
};

pub.validateIap = (receipt) => {
  return iap.setup()
      .then((sets) => {
        debug(sets);

        return iap.validate(iap.APPLE, receipt);
      })
      .then((response) => {
        debug(response);
        if (iap.isValidated(response)) {
          // todo handler
          return iap.getPurchaseData(response);
          /*
              [
                  {
                      productId: xxx,
                      purchasedDate: yyy,
                      quantity: zzz
                  }
              ]
          */
        } else {
          winston.error("%j not valid", receipt);

          return Promise.reject(commonError.BIZ_FAIL_ERROR("Unvalid receipt"));
        }
      })
      .catch((error) => {
        winston.error("%j not valid", receipt);

        return Promise.reject(commonError.BIZ_FAIL_ERROR("Unvalid receipt"));
      });
};

pub.calculateCoins = (purchase) => {
  switch (purchase.productId) {
    case "mianlikeji.uband.iap.ubandcoin50":
      return purchase.quantity * 5000;
    case "mianlikeji.uband.iap.ubandcoin98":
      return purchase.quantity * 9800;
    case "mianlikeji.uband.iap.ubandcoin298":
      return purchase.quantity * 29800;
    case "mianlikeji.uband.iap.ubandcoin488":
      return purchase.quantity * 48800;
    default:
      throw commonError.BIZ_FAIL_ERROR("unsupported purchase");
  }
};

module.exports = pub;
