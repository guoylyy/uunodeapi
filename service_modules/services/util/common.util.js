'use strict';
/**
 * 通用工具类
 */
const uuidV4 = require('uuid/v4');
const uuidV1 = require('uuid/v1');

const RANDOM_STRING_LIBRARY = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RANDOM_STRING_MIN_LENGTH = 6;

const pub = {};

/**
 * 生成随机字符串
 * @param length
 * @param library
 * @returns {string}
 */
pub.generateRandomString = (length, library = RANDOM_STRING_LIBRARY) => {
  const realLength = Math.max(length || 0, RANDOM_STRING_MIN_LENGTH);
  const libraryLength = library.length;

  return (new Array(realLength))
      .join()
      .split(',')
      .map(() => library.charAt(Math.floor(Math.random() * libraryLength)))
      .join('');
};

/**
 * 生成随机key
 *
 * @returns {string}
 */
pub.generateRandomKey = () => {
  return uuidV1() + '-' + uuidV4();
};

module.exports = pub;
