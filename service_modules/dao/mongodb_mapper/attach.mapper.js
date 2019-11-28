
/**
 * attach数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');

const attachSchema = require('./schema/attach.shcema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAM_LIST = ['_id'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['name', 'key', 'attachType', 'fileType', 'size']);

const pub = {};

/**
 * 获取附件item列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return attachSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS);
};

/**
 * 根据id获取附件item
 *
 * @param attachId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (attachId) => {
  return attachSchema.findItemById(attachId);
};

/**
 * 新建附件
 *
 * @param attachItem
 * @returns {attachItem}
 */
pub.create = (attachItem) => {
  if (!_.isPlainObject(attachItem) || !_.isNil(attachItem.id)) {
    winston.error('新建附件失败，参数错误！！！attachItem: %j', attachItem);
    return Promise.reject(new Error('参数错误'));
  }

  return attachSchema.createItem(attachItem);
};

module.exports = pub;
