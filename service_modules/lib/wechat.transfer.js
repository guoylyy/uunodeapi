'use strict';
/**
 * 微信退款服务
 * @author alfred yuan 2016-09-05 11:09:34
 */
const _ = require('lodash');
const moment = require('moment');
const request = require('request');
const uuidV4 = require('uuid/v4');
const crypto = require('crypto');
const Promise = require('bluebird');
const debug = require('debug')('lib');
const winston = require('winston');

const userWithdrawService = require('../services/userWithdraw.service');

const wechatBase = require('./wechat.base');

const enumModel = require('../services/model/enum');

// 微信退款配置
const WITHDRAW_CONFIG = require('../../config/config').WECHAT_APP_WITHDRAW_CONFIG;

const compiledTransferXmlTemplate = _.template('<xml>\
<mch_appid>${ appId }</mch_appid>\
<mchid>${ mchId }</mchid>\
<nonce_str>${ nonceStr }</nonce_str>\
<partner_trade_no>${ tradeNo }</partner_trade_no>\
<openid>${ openId }</openid>\
<check_name>${ checkNameOption }</check_name>\
<re_user_name>${ userName }</re_user_name>\
<amount>${ amount }</amount>\
<desc>${ desc }</desc>\
<spbill_create_ip>${ spBillCreateIp }</spbill_create_ip>\
<sign>${ sign }</sign>\
</xml>');

/**
 * 生成企业付款api所需的xml data
 * 参考 [ https://pay.weixin.qq.com/wiki/doc/api/tools/mch_pay.php?chapter=14_2 ]
 *
 * @param tradeNo       随机字符串，不长于32位
 * @param openId        用户openid
 * @param userName      收款用户真实姓名
 * @param amount        企业付款金额，单位为分
 * @param desc          企业付款操作说明信息。必填。
 * @param nonceStr      随机字符串，不长于32位
 * @returns {string}
 */
const generateTransferXml = (tradeNo, openId, userName, amount, desc, nonceStr) => {
  return compiledTransferXmlTemplate({
    appId: WITHDRAW_CONFIG.appId,  // 微信分配的公众账号ID（企业号corpid即为此appId）
    mchId: WITHDRAW_CONFIG.mchId,  // 微信支付分配的商户号
    nonceStr: nonceStr,            // 随机字符串，不长于32位
    tradeNo: tradeNo,
    openId: openId,                // 商户appid下，某用户的openid
    /**
     * NO_CHECK：不校验真实姓名
     * FORCE_CHECK：强校验真实姓名（未实名认证的用户会校验失败，无法转账）
     * OPTION_CHECK：针对已实名认证的用户才校验真实姓名（未实名认证用户不校验，可以转账成功）
     */
    checkNameOption: WITHDRAW_CONFIG.checkNameOption,
    userName: userName,             // 收款用户真实姓名。如果check_name设置为FORCE_CHECK或OPTION_CHECK，则必填用户真实姓名
    amount: amount,                 // 企业付款金额，单位为分
    desc: desc,                     // 企业付款操作说明信息。必填。
    spBillCreateIp: WITHDRAW_CONFIG.spBillCreateIp, // 调用接口的机器Ip地址
    sign: signTransfer(tradeNo, openId, userName, amount, desc, nonceStr) // 签名
  });
};

const compiledTransferQueryTemplate = _.template('<xml>\
<appid>${ appId }</appid>\
<mch_id>${ mchId }</mch_id>\
<partner_trade_no>${ tradeNo }</partner_trade_no>\
<nonce_str>${ nonceStr }</nonce_str>\
<sign>${ sign }</sign>\
</xml>');

/**
 * 生成企业付款查询api所需的xml data
 * 参考 [ https://pay.weixin.qq.com/wiki/doc/api/tools/mch_pay.php?chapter=14_3 ]
 *
 * @param tradeNo             商户调用企业付款API时使用的商户订单号
 * @param nonceStr            随机字符串，不长于32位
 * @returns {string}
 */
const generateTransferQueryXml = (tradeNo, nonceStr) => {
  return compiledTransferQueryTemplate({
    appId: WITHDRAW_CONFIG.appId,               // 商户号的appid
    mchId: WITHDRAW_CONFIG.mchId,               // 微信支付分配的商户号
    tradeNo: tradeNo,                           // 商户调用企业付款API时使用的商户订单号
    nonceStr: nonceStr,                         // 随机字符串，不长于32位
    sign: signTransferQuery(tradeNo, nonceStr)  // 签名
  })
};

const compiledWithdrawTemplate = _.template('<xml>\
<appid>${ appId }</appid>\
<mch_id>${ mchId }</mch_id>\
<out_refund_no>${ withdrawNo }</out_refund_no>\
<out_trade_no>${ bookingNo }</out_trade_no>\
<refund_fee>${ refundFee }</refund_fee>\
<total_fee>${ totalFee }</total_fee>\
<op_user_id>${ operatorId }</op_user_id>\
<nonce_str>${ nonceStr }</nonce_str>\
<refund_account>${ refundAccount }</refund_account>\
<sign>${ sign }</sign>\
</xml>');

/**
 * 生成公众号退款api所需的xml data
 * 参考 [https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_4]
 *
 * @param withdrawNo      商户系统内部的退款单号，商户系统内部唯一，同一退款单号多次请求只退一笔
 * @param bookingNo       商户侧传给微信的订单号
 * @param refundFee       退款总金额，订单总金额，单位为分，只能为整数
 * @param totalFee        订单总金额，单位为分，只能为整数
 * @param operatorId      操作员帐号, 默认为商户号
 * @param nonceStr        随机字符串，不长于32位。
 * @param refundAccount
 * @returns {string}
 */
const generateWithdrawXml = (withdrawNo, bookingNo, refundFee, totalFee, operatorId, nonceStr, refundAccount) => {
  return compiledWithdrawTemplate({
    appId: WITHDRAW_CONFIG.appId,   // 商户号的appid
    mchId: WITHDRAW_CONFIG.mchId,   // 微信支付分配的商户号
    withdrawNo: withdrawNo,         // 商户系统内部的退款单号，商户系统内部唯一，同一退款单号多次请求只退一笔
    bookingNo: bookingNo,           // 商户侧传给微信的订单号
    refundFee: refundFee,           // 退款总金额，订单总金额，单位为分，只能为整数
    totalFee: totalFee,             // 订单总金额，单位为分，只能为整数
    operatorId: operatorId,         // 操作员帐号, 默认为商户号
    nonceStr: nonceStr,             // 随机字符串，不长于32位。
    /**
     * 仅针对老资金流商户使用
     * REFUND_SOURCE_UNSETTLED_FUNDS---未结算资金退款（默认使用未结算资金退款）
     * REFUND_SOURCE_RECHARGE_FUNDS---可用余额退款(限非当日交易订单的退款）
     */
    refundAccount: refundAccount,
    sign: signWithdraw(withdrawNo, bookingNo, refundFee, totalFee, operatorId, nonceStr, refundAccount)
  });
};


const compiledWithdrawQueryTemplate = _.template('<xml>\
<appid>${ appId }</appid>\
<mch_id>${ mchId }</mch_id>\
<out_refund_no>${ withdrawNo }</out_refund_no>\
<nonce_str>${ nonceStr }</nonce_str>\
<sign>${ sign }</sign>\
</xml>');

/**
 * 生成公众号退款查询api所需的xml data
 * 参考 [https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_5]
 *
 * @param withdrawNo    商户侧传给微信的退款单号
 * @param nonceStr      随机字符串，不长于32位
 * @returns {string}
 */
let generateWithdrawQueryXml = (withdrawNo, nonceStr) => {
  return compiledWithdrawQueryTemplate({
    appId: WITHDRAW_CONFIG.appId,   // 商户号的appid
    mchId: WITHDRAW_CONFIG.mchId,   // 微信支付分配的商户号
    withdrawNo: withdrawNo,         // 商户侧传给微信的退款单号
    nonceStr: nonceStr,             // 随机字符串，不长于32位
    sign: sighWithdrawQuery(withdrawNo, nonceStr)
  });
};

/**
 * 签名 -- 基本方法
 *
 * @param toSignObj
 * @returns {*}
 */
const signWithKey = (toSignObj) => {
  let toSignString = wechatBase.rawString(toSignObj);
  toSignString = toSignString + '&key=' + WITHDRAW_CONFIG.APISecretKey;

  debug(toSignString);

  return crypto.createHash('md5').update(toSignString, 'utf8').digest('hex');
};

/**
 * 签名 -- 企业付款
 *
 * @param tradeNo
 * @param openId
 * @param userName
 * @param amount
 * @param desc
 * @param nonceStr
 */
let signTransfer = (tradeNo, openId, userName, amount, desc, nonceStr) => {
  let transferSign = {
    mch_appid: WITHDRAW_CONFIG.appId,
    mchid: WITHDRAW_CONFIG.mchId,
    nonce_str: nonceStr,
    partner_trade_no: tradeNo,
    openid: openId,
    check_name: WITHDRAW_CONFIG.checkNameOption,
    re_user_name: userName,
    amount: amount,
    desc: desc,
    spbill_create_ip: WITHDRAW_CONFIG.spBillCreateIp
  };

  debug(transferSign);

  return signWithKey(transferSign);
};

/**
 * 签名 -- 企业付款查询
 *
 * @param tradeNo
 * @param nonceStr
 */
const signTransferQuery = (tradeNo, nonceStr) => {
  let transferQuerySign = {
    appid: WITHDRAW_CONFIG.appId,
    mch_id: WITHDRAW_CONFIG.mchId,
    nonce_str: nonceStr,
    partner_trade_no: tradeNo,
  };

  debug(transferQuerySign);

  return signWithKey(transferQuerySign);
};

/**
 * 签名 -- 公众号退款
 *
 * @param withdrawNo
 * @param bookingNo
 * @param refundFee
 * @param totalFee
 * @param operatorId
 * @param nonceStr
 * @param refundAccount
 */
const signWithdraw = (withdrawNo, bookingNo, refundFee, totalFee, operatorId, nonceStr, refundAccount) => {
  let withdrawSign = {
    appid: WITHDRAW_CONFIG.appId,
    mch_id: WITHDRAW_CONFIG.mchId,
    out_refund_no: withdrawNo,
    out_trade_no: bookingNo,
    refund_fee: refundFee,
    total_fee: totalFee,
    op_user_id: operatorId,
    nonce_str: nonceStr,
    refund_account: refundAccount
  };

  debug(withdrawSign);

  return signWithKey(withdrawSign);
};

/**
 * 签名 -- 公众号退款查询
 *
 * @param withdrawNo
 * @param nonceStr
 */
const sighWithdrawQuery = (withdrawNo, nonceStr) => {
  let withdrawQuerySign = {
    appid: WITHDRAW_CONFIG.appId,
    mch_id: WITHDRAW_CONFIG.mchId,
    out_refund_no: withdrawNo,
    nonce_str: nonceStr
  };

  debug(withdrawQuerySign);

  return signWithKey(withdrawQuerySign);
};

// 微信企业转账接口地址
const WECHAT_TRANSFER_URL = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers';
// 微信企业转账结果查询接口地址
const WECHAT_TRANSFER_QUEYR_URL = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo';
// 微信账单退款接口地址
const WECHAT_WITHDRAW_URL = 'https://api.mch.weixin.qq.com/secapi/pay/refund';
// 微信查询账单退款接口地址
const WECHAT_WITHDRAW_QUERY_URL = 'https://api.mch.weixin.qq.com/pay/refundquery';

/**
 * 发送Post请求，携带pem证书文件
 *
 * @param url                 接口地址
 * @param body                body，xml格式
 * @param parseErrorHandler   解析错误处理函数
 * @returns {Promise.<TResult>}
 */
const postRequestWithCert = (url, body, parseErrorHandler) => {
  debug(url);
  debug(body);

  return new Promise(
      (resolve, reject) => {
        request({
              url: url,
              method: 'POST',
              cert: WITHDRAW_CONFIG.cert,    // 证书
              key: WITHDRAW_CONFIG.cert_key, // 密钥
              body: body
            },
            (err, response, body) => {
              if (!err && response.statusCode == 200) {
                resolve(body);
              } else {
                reject(err);
              }
            });
      })
      .then((responseBody) => {
        const responseBodyStr = responseBody.toString('utf-8');

        return wechatBase.parseWechatResponseBody(responseBodyStr)
            .catch((error) => parseErrorHandler(error, responseBodyStr));
      })
};

let pub = {};

/**
 * 企业付款
 * @param openId
 * @param userName
 * @param amount
 * @param desc
 * @returns {AV.Promise}
 */
pub.transferToUser = (openId, userName, amount, desc) => {
  const timeStamp = Date.now(), // 时间戳
      nonceStr = 'nonce_' + timeStamp + '_' + uuidV4().substr(0, 4), // 随机字符串
      transferNo = 'TRANSFER' + timeStamp + '' + uuidV4().substr(0, 4), // 商户订单号
      formData = generateTransferXml(transferNo, openId, userName, amount, desc, nonceStr);

  // 支付结果
  const transferResult = {
    success: false,
    transferData: {
      nonce_str: nonceStr,
      partner_trade_no: transferNo,
      openid: openId,
      check_name: WITHDRAW_CONFIG.checkNameOption,
      re_user_name: userName,
      amount: amount,
      desc: desc
    },
    transferResult: {}
  };

  return postRequestWithCert(
      WECHAT_TRANSFER_URL,
      formData,
      (error, responseBodyStr) => {
        winston.error('[xml_parse_fail]');
        winston.error(error);

        return Promise.resolve(responseBodyStr)
      })
      .then((payResult) => {
        transferResult.success = payResult.result_code === 'SUCCESS';
        transferResult.transferResult = payResult;

        userWithdrawService.logUserWithdraw(enumModel.withdrawLogTypeEnum.WECHAT_TRANSFER.key, transferResult);

        return transferResult;
      })
      .catch((error) => {
        winston.error('[withdraw_fail]');
        winston.error(error);

        userWithdrawService.logUserWithdraw(enumModel.withdrawLogTypeEnum.WECHAT_TRANSFER.key, transferResult);

        return Promise.reject(error);
      });
};

/**
 * 查询企业转账结果
 * @param tradeNo
 * @returns {AV.Promise}
 */
pub.queryTransfer = (tradeNo) => {
  // 随机字符串
  const nonceStr = 'nonce_' + (Date.now()) + '_' + uuidV4().substr(0, 4),
      formData = generateTransferQueryXml(tradeNo, nonceStr);

  return postRequestWithCert(
      WECHAT_TRANSFER_QUEYR_URL,
      formData,
      (error) => {
        winston.error('[xml_parse_fail]');

        return Promise.reject(error);
      })
      .catch((error) => {
        winston.error('[query_withdraw_fail]');
        winston.error(error);

        return Promise.reject(error);
      });
};

/**
 * 账单退款
 * @param bookingNo
 * @param refundFee
 * @param totalFee
 * @param operatorId
 * @param refundAccount
 * @returns {AV.Promise}
 */
pub.withdraw = (bookingNo, refundFee, totalFee, operatorId, refundAccount) => {
  const timeStamp = Date.now(), // 时间戳
      nonceStr = 'nonce_' + timeStamp + '_' + uuidV4().substr(0, 4), // 随机字符串
      withdrawNo = 'WITHDRAW_' + timeStamp + '_' + uuidV4().substr(0, 4), // 商户订单号
      formData = generateWithdrawXml(withdrawNo, bookingNo, refundFee, totalFee, operatorId, nonceStr, refundAccount);

  debug(timeStamp);
  debug(nonceStr);
  debug(withdrawNo);
  debug(formData);

  // 返回对象
  const withdrawResult = {
    success: false,
    refundData: {
      out_refund_no: withdrawNo,
      out_trade_no: bookingNo,
      refund_fee: refundFee,
      total_fee: totalFee,
      op_user_id: operatorId,
      nonce_str: nonceStr,
      refund_account: refundAccount
    },
    refundResult: {}
  };

  return postRequestWithCert(
      WECHAT_WITHDRAW_URL,
      formData,
      (error, bodyStr) => {
        winston.error('[xml_parse_fail]');
        winston.error(error);

        return Promise.resolve(bodyStr);
      })
      .then((refundResult) => {
        withdrawResult.success = refundResult.result_code === 'SUCCESS';
        withdrawResult.refundResult = refundResult;

        userWithdrawService.logUserWithdraw(enumModel.withdrawLogTypeEnum.WECHAT_WITHDRAW.key, withdrawResult);

        return withdrawResult;
      })
      .catch((err) => {
        winston.error('[transfer_fail]');
        winston.error(err);

        userWithdrawService.logUserWithdraw(enumModel.withdrawLogTypeEnum.WECHAT_WITHDRAW.key, withdrawResult);

        return Promise.reject(err);
      });
};

/**
 * 查询账单退款
 * @param withdrawNo
 * @returns {AV.Promise}
 */
pub.queryWithdraw = (withdrawNo) => {

  const nonceStr = 'nonce_' + (Date.now()) + '_' + uuidV4().substr(0, 4), // 随机字符串
      formData = generateWithdrawQueryXml(withdrawNo, nonceStr);

  return postRequestWithCert(
      WECHAT_WITHDRAW_QUERY_URL,
      formData,
      (error) => {
        winston.error('[xml_parse_fail]');

        return Promise.reject(error);
      })
      .catch((error) => {
        winston.error('[query_transfer_fail]');
        winston.error(error);

        return Promise.reject(error);
      });
};

module.exports = pub;
