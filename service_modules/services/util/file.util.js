'use strict';

const _ = require('lodash');
const debug = require('debug')('util');
const winston = require('winston');
const Promise = require('bluebird');
const http = require('http');
const fs = require('fs');
const request = require('request');

const enumModel = require('../model/enum');
const commonError = require('../model/common.error');

const amrUtil = require('./amr.util');

// 临时目录
const TMP_DIR = 'tmp';

// Create the TMP_DIR directory if it does not exist
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR);
}

const pub = {};

/**
 * 下载文件到临时文件
 *
 * @param fileUrl
 * @param fileName
 * @returns {Promise}
 */
pub.downloadFileInTmp = (fileUrl, fileName) => {
  return new Promise((resolve, reject) => {
    const saveFile = fs.createWriteStream(TMP_DIR + '/' + fileName);

    debug(saveFile);

    request.get(fileUrl)
        .on('response', (response) => {
          const statusCode = response.statusCode;
          const contentType = response.headers['content-type'];
          debug(statusCode);
          debug(contentType);

          const responseError = (statusCode !== 200)
              ? new Error('Request Failed! status code: ' + statusCode)
              : (/^application\/json|text\/plain/.test(contentType))
                  ? new Error('Invalid Media Id!')
                  : null;

          debug(responseError);
          if (!_.isNil(responseError)) {
            // consume response data to free up memory
            response.resume();
            return reject(responseError);
          }
        })
        .on('error', (error) => {
          winston.error(error);

          return reject(error);
        })
        .pipe(saveFile);

    saveFile.on('finish', () => {
      saveFile.close(() => {
        return resolve(saveFile.path);
      });
    });
  });
};

/**
 * 在 TMP_DIR 目录下将amr文件进行转换
 *
 * @param amrFileName
 * @param saveFileName
 */
pub.amrHandler = (amrFileName, saveFileName) => {
  return amrUtil(TMP_DIR + '/' + amrFileName, TMP_DIR + '/' + saveFileName);
};

/**
 * 判断用户文件是否需要进行下载
 *
 * @param userFileItem
 * @returns {boolean}
 */
pub.isUserFileNeedDownload = (userFileItem) => {
  // 如果 userFileItem 为空， 则无需下载
  if (_.isNil(userFileItem)) {
    return false;
  }

  /**
   * 1. fileUrl为空
   * 2. 文件为图片，且名称为空 ： 文件名为空的图片为用户在服务号直接发送的，无法直接fileUrl进行下载
   */
  return _.isNil(userFileItem.fileUrl)
      || (userFileItem.fileType === enumModel.fileTypeEnum.image.key && _.isNil(userFileItem.fileName))
};

/**
 * 压缩文件名到length
 *
 * @param fileName
 * @param length
 * @returns {*}
 */
pub.compactFileName = (fileName, length = 64) => {
  if (!_.isString(fileName) || !_.isSafeInteger(length) || length < 0) {
    throw commonError.PARAMETER_ERROR();
  }

  if (_.size(fileName) <= length) {
    return fileName;
  }

  // 后缀： 时间戳
  const nameSuffix = `${ _.now() }`;
  // 最后一个 . 的位置，之后的认为是文件类型
  const lastDotIndex = fileName.lastIndexOf(".");

  // 文件类型
  const fileType = lastDotIndex >= 0 ? fileName.substr(lastDotIndex) : '';
  // 文件名
  const name = lastDotIndex >= 0 ? fileName.substr(0, lastDotIndex) : fileName;

  // 文件名长度，最小为0
  const nameLength = _.max([0, length - _.size(fileType) - _.size(nameSuffix) - 1]);

  return `${ name.substr(0, nameLength) }_${ nameSuffix }${ fileType }`;
};

module.exports = pub;
