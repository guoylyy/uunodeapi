'use strict';
/**
 * 微信sdk签名工具
 * @returns {string}
 */
const _ = require('lodash');
const debug = require('debug')('lib');
const crypto = require('crypto');

const systemConfig = require('../../config/config');

const wechatBase = require('./wechat.base');
const wechatAuth = require('./wechat.auth');

let createNonceStr = () => {
  return Math.random().toString(36).substr(2, 15);
};

let createTimestamp = () => {
  return '' + _.toSafeInteger(_.now() / 1000);
};

let pub = {};
/**
 * @synopsis 签名算法
 *
 * @param url 用于签名的 url ，注意必须动态获取，不能 hardcode
 *
 * @returns
 */
pub.signUrl = (url) => {
  return wechatAuth.requestLocalWechatJsApiTicket()
      .then((jsApiTicket) => {
        let signResult = {
          jsapi_ticket: jsApiTicket,
          noncestr: createNonceStr(),
          timestamp: createTimestamp(),
          url: url
        };

        let string = wechatBase.rawString(signResult);
        debug(string);

        signResult.signature = crypto.createHash('sha1').update(string).digest('hex');

        // 加入appid
        signResult.appId = systemConfig.WECHAT_APP_CONFIG.APP_ID;
        // 重命名noncestr
        signResult.nonceStr = signResult.noncestr;

        delete signResult.noncestr;

        return signResult;
      })
};

/**
 * 验证服务器地址的有效性
 *
 * @param signature
 * @param timestamp
 * @param nonce
 * @returns {boolean}
 */
pub.checkSignature = (signature, timestamp, nonce) => {
  let originStr = [systemConfig.WECHAT_APP_CONFIG.TOKEN, timestamp, nonce].sort().join('');

  let signedStr = crypto.createHash('sha1').update(originStr).digest('hex');

  debug('%s == %s', signature, signedStr);

  return signature === signedStr;
};

/**
 * 微信用户数据的签名验证和加解密
 * 参考：[微信小程序开发文档 用户数据的签名验证和加解密](https://mp.weixin.qq.com/debug/wxadoc/dev/api/signature.html)
 *
 * @param appId
 * @param sessionKey
 * @returns {{decryptData: (function(*=, *=))}}
 */
pub.wxBizDataCrypt = (appId, sessionKey) => {
  return {
    decryptData: (encryptedData, iv) => {
      // base64 decode
      const sessionKeyBuffer = new Buffer(sessionKey, 'base64');
      const encryptedDataBuffer = new Buffer(encryptedData, 'base64');
      const ivBuffer = new Buffer(iv, 'base64');

      let decoded;

      try {
        // 解密
        const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
        // 设置自动 padding 为 true，删除填充补位
        decipher.setAutoPadding(true);
        decoded = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
        decoded += decipher.final('utf8');

        decoded = JSON.parse(decoded);
      } catch (err) {
        console.error(err);
        throw new Error('Illegal Buffer');
      }

      if (decoded.watermark.appid !== appId) {
        throw new Error('Illegal Buffer');
      }

      return decoded;
    }
  };
};

module.exports = pub;
