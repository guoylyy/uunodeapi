'use strict';
/**
 * 七牛云component，提供七牛云附件相关操作方法
 */
const _ = require('lodash');
const debug = require('debug')('component');
const qiniu = require("qiniu");
const Promise = require('bluebird');
const winston = require('winston');
const formurlencoded = require('form-urlencoded');

const commonUtil = require('../util/common.util');

const systemConfig = require('../../../config/config');

/**
 * 根据七牛云文件类型(type)获取系统配置
 *  如果类型不存在,则抛出Error
 * @param type
 * @returns {*}
 */
const getConfig = (type) => {
  const qiniuConfig = systemConfig.QINIU_OPTIONS[type];

  if (!qiniuConfig) {
    winston.error('不可识别的七牛云文件类型： %s！！！', type);
    throw '不可识别的七牛云文件类型'
  } else {
    return qiniuConfig;
  }
};

/**
 * 根据配置文件对七牛对象进行公钥和私钥的配置
 * @param qiniu Object
 * @param config
 */
const configQiniu = (qiniu, config) => {
  //需要填写你的 Access Key 和 Secret Key
  qiniu.conf.ACCESS_KEY = config.ACCESS_KEY;
  qiniu.conf.SECRET_KEY = config.SECRET_KEY;
};

/**
 * 根据文件类型获取对url所表示文件的可访问url
 *  url中可包含对文件的处理
 * @param type String 七牛文件类型
 * @param url
 * @returns {string}
 */
const getAccessibleUrl = (type, url) => {
  const config = getConfig(type);
  const accessUrl = config.DOMAIN_URL + '/' + url;

  // 如果可公开访问,则直接返回
  if (config.IS_PUBLIC) {
    return accessUrl;
  }

  configQiniu(qiniu, config);
  const policy = new qiniu.rs.GetPolicy();

  //生成下载链接url
  return encodeURI(policy.makeRequest(accessUrl));
};

/**
 * 七牛回调的body模板构造方法
 * @param {{attachType: attachType, fileType: fileType}}
 * @returns {string}
 */
const callbackBodyTemplate = _.template('name=$(fname)&fsize=$(fsize)&key=$(key)&mimeType=$(mimeType)&attachType=${ attachType }&fileType=${ fileType }&userId=${ userId }');
/**
 * 构造上传文件的权限token
 *  其中包含上传策略，设置回调的url以及需要回调给业务服务器的数据
 * @param callbackUrl   七牛回调地址，必须
 * @param attachType    必需
 * @param key           必需
 * @param fileType      必需
 * @param userId        非必需
 */
const generateUploadToken = (callbackUrl, attachType, key, fileType, userId) => {
  const config = getConfig(attachType);

  configQiniu(qiniu, config);

  const putPolicy = new qiniu.rs.PutPolicy(config.BUCKET + ':' + key);
  putPolicy.insertOnly = 1;
  putPolicy.callbackUrl = callbackUrl;
  putPolicy.callbackBody = callbackBodyTemplate({
    attachType: attachType,
    fileType: fileType,
    userId: userId
  });
  putPolicy.callbackBodyType = 'application/x-www-form-urlencoded';

  return putPolicy.token();
};


const pub = {};

/**
 * 七牛云上传文件token及key的统一生成器
 *
 * @param tokenBody
 * @param qiniuCallbackUrl
 * @param userId
 * @returns {{upToken, key: string}}
 */
pub.fileTokenBodyHandler = (tokenBody, qiniuCallbackUrl, userId) => {
  debug(tokenBody);
  debug(qiniuCallbackUrl);
  debug(userId);

  const qiniuFileKey = _.now() + '_' + commonUtil.generateRandomString(6) + '_' + tokenBody.fileName;
  const upToken = generateUploadToken(
      qiniuCallbackUrl,
      tokenBody.attachType,
      qiniuFileKey,
      tokenBody.fileType,
      userId
  );

  return {
    upToken: upToken,
    key: qiniuFileKey
  };
};

/**
 * 获取文件可访问链接
 * 根据文件类型获取对url所表示文件的可访问url
 *  url中可包含对文件的处理
 * @param type String 七牛文件类型
 * @param url
 * @returns {string}
 */
pub.getAccessibleUrl = getAccessibleUrl;

/**
 * 删除文件
 * @param attachType  附件类型
 * @param key         文件key
 * @returns {*}
 */
pub.deleteFile = (attachType, key) => {
  const config = getConfig(attachType);

  configQiniu(qiniu, config);
  //构建bucket manager client对象
  const client = new qiniu.rs.Client();

  //删除资源
  const removePromise = Promise.promisify(client.remove);

  return removePromise(config.BUCKET, key);
};

/**
 * 检查是否为合法的回调
 * @param callbackUrl   七牛回调地址，必须
 * @param body  回调body
 * @param auth  header中的auth
 * @returns {*}
 */
pub.isCallbackValid = (callbackUrl, body, auth) => {
  const config = getConfig(body.attachType);
  configQiniu(qiniu, config);

  try {
    return qiniu.util.isQiniuCallback(callbackUrl, formurlencoded(body), auth);
  } catch (err) {
    winston.error("ERROR: 回调验证失败!!! 参数:\n\tbody: %j,\n\tauth: %s", body, auth);
    return false;
  }
};

// 图片预览
pub.previewImage = (attachType, key, width, height) => {
  return getAccessibleUrl(attachType, key + '?imageView2/1/w/' + width + '/h/' + height);
};

/**
 * 生成视频第3秒缩略图
 * @param attachType
 * @param key
 * @param width
 * @param height
 * @returns {string}
 */
pub.previewVideo = (attachType, key, width, height) => {
  return getAccessibleUrl(attachType, key + '?vframe/png/offset/3/w/' + width + '/h/' + height);
};

// 上传文件promise方法
const putFilePromise = Promise.promisify(qiniu.io.putFile);
/**
 * 上传文件Promise
 * @param attachType  附件类型
 * @param key         附件key
 * @param fileType    文件类型
 * @param filePath    文件路径
 * @returns {*}
 */
pub.uploadFilePromise = (attachType, key, fileType, filePath) => {
  const config = getConfig(attachType);
  configQiniu(qiniu, config);

  const putPolicy = new qiniu.rs.PutPolicy(config.BUCKET + ':' + key);
  putPolicy.insertOnly = 1;
  const uptoken = putPolicy.token();

  // 上传七牛文件
  const extra = new qiniu.io.PutExtra();

  return putFilePromise(uptoken, key, filePath, extra);
};

module.exports = pub;
