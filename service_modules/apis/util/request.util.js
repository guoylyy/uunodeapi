"use strict";

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('util');

const commonError = require("../../services/model/common.error");
const fileUtil = require("../../services/util/file.util");

const pub = {};

/**
 * 处理fileName
 *
 * @param requestBody
 */
pub.compactFileNamePromise = (requestBody) => {
  return new Promise(
      (resolve, reject) => {
        const fileName = requestBody.fileName;

        debug(fileName);

        if (_.isNil(fileName) || !_.isString(fileName)) {
          return reject(commonError.PARAMETER_ERROR("fileName必须存在，且为字符串"));
        }
        // 压缩文件名
        requestBody.fileName = fileUtil.compactFileName(fileName);

        debug(requestBody);

        return resolve(requestBody);
      });
};

module.exports = pub;
