'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const interactiveGuideChatMapper = require('../dao/mongodb_mapper/interactiveGuideChat.mapper');

const pub = {};

/**
 * 获取全部交互对话数据
 *  -- 已设置userInfo信息
 * @param currentUserItem
 * @returns {Promise|Promise.<*>}
 */
pub.fetchAllInteractiveGuideChat = (currentUserItem) => {
  if (!_.isPlainObject(currentUserItem)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(currentUserItem);

  // 设置是否为本身
  currentUserItem.isSelf = true;

  return interactiveGuideChatMapper.queryAll({})
      .then((chatList) => {
        debug(chatList);

        _.forEach(chatList, (chatItem) => {
          // 根据userId是否为-1，设置用户信息
          if (chatItem.userId !== -1) {
            chatItem.userInfo = currentUserItem;
          }
        });

        return chatList;
      });
};

module.exports = pub;
