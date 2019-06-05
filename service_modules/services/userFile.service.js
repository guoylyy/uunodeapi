'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonUtil = require('./util/common.util');
const commonError = require('./model/common.error');

const userService = require('./user.service');
const attachService = require('./attach.service');

const userFileMapper = require('../dao/mongodb_mapper/userFile.mapper');

const pub = {};

/**
 * 新建userFile
 *
 * @param userFile
 * @returns {Promise|Promise.<*>}
 */
pub.createUserFile = (userFile) => {
  debug(userFile);

  if (!_.isPlainObject(userFile) || _.isNil(userFile.userId) || !_.isNil(userFile.id)) {
    winston.error('保存用户文件失败！！！参数为%j', userFile);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userFileMapper.create(userFile);
};

/**
 * 保存七牛回调后的内容为UserFile
 *
 * @param userId      用户id
 * @param qiniuFile   七牛回调body内容
 * @returns {Promise.<TResult>|Promise}
 */
pub.saveQiniuFileAsUserFile = (userId, qiniuFile) => {
  let globalUserItem, // 记录用户信息
      globalAttachItem; // 记录附件信息

  return userService.fetchById(userId)
      .then((userItem) => {
        debug(userItem);
        globalUserItem = userItem;

        if (_.isNil(userItem)) {
          return Promise.reject(commonError.PARAMETER_ERROR('不存在的用户'));
        }

        let attach = {
          name: qiniuFile.name,
          key: qiniuFile.key,
          size: qiniuFile.fsize,
          attachType: qiniuFile.attachType,
          fileType: qiniuFile.fileType,
          mimeType: qiniuFile.mimeType,
          userId: userItem.id
        };

        debug(attach);

        return attachService.createAttach(attach)
      })
      .then((attachItem) => {
        debug(attachItem);

        globalAttachItem = attachItem;

        const userFileItem = {
          fileKey: commonUtil.generateRandomKey(),
          fileType: attachItem.fileType,
          fileName: attachItem.name,
          openId: globalUserItem.openId,
          upTime: new Date(),
          format: 'text',
          fileUrl: attachItem.url, // 可访问url
          attach: attachItem.id,
          hasCheckined: false,
          userId: globalUserItem.id
        };

        return pub.createUserFile(userFileItem);
      })
      .then((userFileItem) => {
        return [globalAttachItem, userFileItem];
      });
};

/**
 * 根据 fetchById 获取用户文件
 *
 * @param userFileId
 * @returns {*}
 */
pub.fetchUserFileById = (userFileId) => {
  if (_.isNil(userFileId)) {
    winston.error('根据id获取用户文件失败，参数错误！！！userFileId: %s', userFileId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userFileMapper.fetchById(userFileId);
};

/**
 * 更新用户文件信息
 *
 * @param userFileId
 * @param userFileItem
 * @returns {*}
 */
pub.updateUserFileItem = (userFileId, userFileItem) => {
  if (_.isNil(userFileId) || !_.isPlainObject(userFileItem)) {
    winston.error('根据id更新用户文件失败，参数错误！！！userFileId: %s, userFileItem: %j', userFileId, userFileItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userFileMapper.updateById(userFileId, userFileItem);
};

/**
 * 销毁用户上传文件记录
 * @param userFileId
 */
pub.deleteUserFileItem = (userFileId) =>{
  if (_.isNil(userFileId) ) {
    winston.error('根据id更新用户文件失败，参数错误！！！userFileId: %s', userFileId );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return userFileMapper.deleteById(userFileId);
};

module.exports = pub;
