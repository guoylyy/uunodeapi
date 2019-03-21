'use strict';

/**
 * 加密基础工具
 * @type {*}
 */

const debug = require('debug')('util');
const Promise = require('bluebird');
const bcrypt = require('bcrypt');

const hashPasswordPromise = Promise.promisify(bcrypt.hash);
const comparePasswordPromise = Promise.promisify(bcrypt.compare);

const pub = {};

/**
 * 获取加密算法
 *
 * @param saltRounds 加密轮数配置
 */
pub.getHashPasswordPromiseFunction = (saltRounds) => {
  /**
   * 加密算法
   *
   * @param password  初始化密码
   */
  return (password) => {
    debug(saltRounds);
    debug(password);

    return hashPasswordPromise(password, saltRounds);
  }
};

/**
 * 比较密码
 *
 * @param password      明文密码
 * @param saltPassword  哈希后的密码
 */
pub.comparePasswordPromise = (password, saltPassword) => comparePasswordPromise(password, saltPassword);

module.exports = pub;
