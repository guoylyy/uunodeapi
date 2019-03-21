"use strict";

const _ = require('lodash');
const debug = require('debug')('util');
const jwt = require('jsonwebtoken');

const jwtVerify = Promise.promisify(jwt.verify);
const jwtSign = Promise.promisify(jwt.sign);

/**
 * 去除jwt token中的header
 * @param token
 */
const removeTokenHeader = (token) => _.chain(token)
    .split(".")
    .tail()
    .join(".")
    .value();

/**
 * 获取jwt的header
 *
 * @param secretKey
 * @param options
 */
const getTokenHeader = (secretKey, options) => {
  return jwtSign({ id: -1 }, secretKey, options)
      .then((newToken) => {
        debug(newToken);

        return _.chain(newToken)
            .split(".")
            .head()
            .value();
      });
};

const pub = {};

/**
 * token 签名，获取新的token
 *   -- 已去除header
 *
 * @param payload
 * @param secretKey
 * @param signOptions
 */
pub.sign = (payload, secretKey, signOptions) => {
  debug(payload);
  debug(secretKey);
  debug(signOptions);

  return jwtSign(payload, secretKey, signOptions)
      .then((token) => {
        debug(token);

        return removeTokenHeader(token);
      });
};

/**
 * 验证 headless token
 *
 * @param token
 * @param secretKey
 * @param options
 * @returns {*}
 */
pub.verify = (token, secretKey, options) => {
  debug(token);
  debug(secretKey);
  debug(options);

  return getTokenHeader(secretKey, options)
      .then((tokenHeader) => {
        debug(tokenHeader);

        return jwtVerify(`${ tokenHeader }.${ token }`, secretKey, options);
      });
};

module.exports = pub;
