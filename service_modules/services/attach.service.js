'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const winston = require('winston');
const Promise = require('bluebird');

const commonError = require('./model/common.error');

const attachMapper = require('../dao/mongodb_mapper/attach.mapper');
const qiniuComponent = require('./component/qiniu.component');

let pub = {};

/**
 * 根据id列表获取附件列表，带可访问url
 *
 * @param attachIds
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAttachList = (attachIds) => {
  if (!_.isArray(attachIds)) {
    winston.error('获取附件列表失败，参数错误！！！attachIds: %j', attachIds);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 如果为空，则直接返回空数组
  if (_.isEmpty(attachIds)) {
    return Promise.resolve([]);
  }

  return attachMapper.query({ '_id': attachIds })
      .then((attachList) => {
        _.forEach(attachList, (item) => {
          item.url = qiniuComponent.getAccessibleUrl(item.attachType, item.key);
        });

        debug(attachList);

        return attachList;
      })
};

/**
 * 新建一条附件记录
 * @param attachItem
 * @returns {*}
 */
pub.createAttach = (attachItem) => {
  if (!_.isPlainObject(attachItem) || !_.isNil(attachItem.id)) {
    winston.error('新建附件失败，参数错误！！！attachItem: %j', attachItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return attachMapper.create(attachItem)
      .then((attachItem) => {
        // 为新建的attach增加可访问url
        attachItem.url = qiniuComponent.getAccessibleUrl(attachItem.attachType, attachItem.key);

        debug(attachItem);

        return attachItem;
      });
};

/**
 * 根据id获取附件条目
 *
 * @param attachId
 * @returns {*}
 */
pub.fetchAttachById = (attachId) => {
  if (_.isNil(attachId)) {
    winston.error('根据id获取附件失败，参数错误！！！attachId: %j', attachId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return attachMapper.fetchById(attachId)
      .then((attachItem) => {
        if (!_.isNil(attachItem)) {
          // 为新建的attach增加可访问url
          attachItem.url = qiniuComponent.getAccessibleUrl(attachItem.attachType, attachItem.key);
        }

        return attachItem;
      });
};

module.exports = pub;
