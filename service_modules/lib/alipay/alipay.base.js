"use strict";

const _ = require('lodash');
const debug = require('debug')('lib');
const crypto = require('crypto');

const ALIPAY_ALGORITHM_MAPPING = {
  RSA: "RSA-SHA1",
  RSA2: "RSA-SHA256"
};
const ALIPAY_API_LIST = {
  'alipay.trade.query': '订单查询',
  'alipay.trade.app.pay': '生成创建订单所需参数',
  'async.notify': '异步通知' // 自定义
};

const ALIPAY_API_RESPONSE_LIST = _.chain(ALIPAY_API_LIST)
    .keys()
    .map((name) => `${ name.replace(/\./g, '_') }_response`)
    .value();

debug(ALIPAY_API_RESPONSE_LIST);

const responseType = (response) => {
  for (let key of ALIPAY_API_RESPONSE_LIST) {
    if (!_.isNil(response[key])) {
      return key;
    }
  }

  return null;
};

const pub = {};

const normalizePrivateKeys = (privateKey) => {
  if (privateKey.indexOf('BEGIN RSA PRIVATE KEY') === -1) {
    return "-----BEGIN RSA PRIVATE KEY-----\n" + privateKey + "\n-----END RSA PRIVATE KEY-----"
  }

  return privateKey;
};

const normalizePublicKey = (publicKey) => {
  if (publicKey.indexOf('BEGIN PUBLIC KEY') === -1) {
    return "-----BEGIN PUBLIC KEY-----\n" + publicKey + "\n-----END PUBLIC KEY-----"
  }

  return publicKey;
};

/**
 * 生成支付宝签名字符串
 *
 * 获取所有请求参数，不包括字节类型参数，如文件、字节流，剔除sign字段，
 * 剔除值为空的参数，
 * 并按照第一个字符的键值ASCII码递增排序（字母升序排序），
 * 如果遇到相同字符则按照第二个字符的键值ASCII码递增排序，以此类推。
 *
 * @param params
 * @param omit
 * @returns {Array.<T>}
 */
pub.makeSignStr = (params, omit = ["sign"]) => {
  return _.chain(params)
      .keys()
      .sort()
      .reject((key) => _.isNil(params[key]) || _.includes(omit, key))
      .map((key) => {
        const value = _.isObjectLike(params[key])
            ? JSON.stringify(params[key])
            : params[key];

        return `${ key }=${ value }`;
      })
      .join("&")
      .value();
};


/**
 * 支付宝签名函数
 *
 * 使用各自语言对应的SHA256WithRSA(对应sign_type为RSA2)或SHA1WithRSA(对应sign_type为RSA)签名函数利用商户私钥对待签名字符串进行签名，
 * 并进行Base64编码。
 *
 * https://doc.open.alipay.com/docs/doc.htm?docType=1&articleId=106118
 *
 * @param params
 * @param privateKey
 * @returns {number|*}
 */
pub.makeSign = (params, privateKey) => {
  const signStr = pub.makeSignStr(params);
  const algorithm = _.get(ALIPAY_ALGORITHM_MAPPING, params.sign_type, ALIPAY_ALGORITHM_MAPPING.RSA2);
  const charSet = _.get(params, ["charset"], "utf-8");

  const signer = crypto.createSign(algorithm);
  signer.update(signStr, charSet);

  return signer.sign(privateKey, "base64");
};

/**
 * 支付宝验证签名函数
 *
 * https://doc.open.alipay.com/docs/doc.htm?docType=1&articleId=106120
 *
 * @param response
 * @param publicKey
 * @param options
 * @param omit
 * @returns {*}
 */
pub.verifySign = (response, publicKey, options, omit) => {
  const type = responseType(response);

  const responseSign = response.sign;

  if (_.isNil(type) || _.isNil(responseSign)) {
    return false;
  }

  const rawSingStr = pub.makeSignStr(response[type], omit);
  const algorithm = _.get(ALIPAY_ALGORITHM_MAPPING, options.sign_type, ALIPAY_ALGORITHM_MAPPING.RSA2);
  const charSet = _.get(options, ["charset"], "utf-8");

  const verify = crypto.createVerify(algorithm);
  verify.update(rawSingStr, charSet);

  return verify.verify(publicKey, responseSign, 'base64');
};

pub.ALIPAY_DEV_GATEWAY = 'https://openapi.alipaydev.com/gateway.do';
pub.ALIPAY_GATEWAY = 'https://openapi.alipay.com/gateway.do';

pub.ALIPAY_NOTIFY_SUCCESS = 'success';
pub.ALIPAY_NOTIFY_FAILURE = 'failure';

pub.ALIPAY_METHOD_TYPES = {
  CREATE_APP_ORDER: "alipay.trade.app.pay",
  TRADE_REFUND: "alipay.trade.refund",
  QUERY_ORDER: 'alipay.trade.query',
  TRADE_REFUND_QUERY: 'alipay.trade.fastpay.refund.query'
};

module.exports = pub;
