"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');

const userFileSchema = require('./schema/userFile.schema');
const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const QUERY_SAFE_PARAM_LIST = ['userId', 'upTime'];
const DEFAULT_SELECT_FIELDS = queryUtil.disposeSelectColumn(['upTime', 'fileType', 'fileName', 'hasCheckined', 'fileUrl', 'fileKey']);
const DEFAULT_SORT_BY = queryUtil.disposeSortBy([{ column: 'upTime', isDescending: true }]);
// 限制可更新的字段
const UPDATE_SAFE_FIELD_LIST = ['fileUrl', 'fileName', 'attach'];

const pub = {};

/**
 * 分页查询班级数据
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return userFileSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, DEFAULT_SELECT_FIELDS, DEFAULT_SORT_BY);
};

/**
 * 创建用户文件记录，用于打卡
 *
 * @param userFileItem
 * @returns {userFileItem}
 */
pub.create = (userFileItem) => {
  return userFileSchema.createItem(userFileItem);
};

/**
 * 根据 userFileId 获取用户文件
 *
 * @param userFileId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (userFileId) => {
  return userFileSchema.findItemById(userFileId);
};

/**
 * 根据 Id 列表获取用户文件
 */
pub.fetchByIds = (userFileIds) =>{
  let ids = _.filter(userFileIds, (id) => {return id.length > 10});
  return userFileSchema.find().where({'_id':{$in:ids}});
};

/**
 * 删除用户上传的文件记录
 * @param userFileId
 */
pub.deleteById = (userFileId) => {
  return userFileSchema.destroyItem(userFileId);
};

/**
 * 根据id更新用户文件信息
 *
 * @param userFileId
 * @param userFileItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (userFileId, userFileItem) => {
  const pickedCheckinItem = mongoUtil.pickUpdateParams(userFileItem, UPDATE_SAFE_FIELD_LIST);

  debug(userFileId, pickedCheckinItem);

  return userFileSchema.updateItemById(userFileId, pickedCheckinItem);
};

module.exports = pub;
