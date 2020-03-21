"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const checkinSchema = require('./schema/checkin.schema');
const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const pub = {};

const QUERY_SAFE_PARAM_LIST = ['clazz', 'taskId', '_id', 'isPublic', 'userId', 'checkinTime', 'isFeatured', 'reviews', 'hasReviews'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['id', 'checkinTime', 'isPublic', 'status', 'userId', 'remark', 'isPublic', 'title', 'score', 'clazz', 'checkinFiles.fileKeys', 'userScoreId', 'likeArr', 'dislikeArr', 'reviews', 'isFeatured']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{column: 'checkinTime', isDescending: true}]);

/**
 * 分页获取打卡列表
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.queryPageCheckinList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return checkinSchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY);
};

/**
 * 查询打卡列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.queryCheckinList = (queryParam) => {
  return checkinSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

/**
 * 根据id获取打卡详情
 *
 * @param checkId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (checkId) => {
  return checkinSchema.findItemById(checkId);
};

/**
 * 根据id将checkin更新为checkinItem中的信息
 * @param checkinId
 * @param checkinItem
 * @returns {Promise.<TResult>}
 */
const safeUpdateParamList = ['checkinFiles', 'status', 'score', 'remark', 'isPublic', 'userScore', 'userScoreIds', 'likeArr', 'dislikeArr', 'reviews', 'isFeatured', 'hasReviews']; // 限制可更新的字段
pub.updateById = (checkinId, checkinItem) => {
  const pickedCheckinItem = mongoUtil.pickUpdateParams(checkinItem, safeUpdateParamList);

  debug(checkinId, pickedCheckinItem);

  return checkinSchema.updateItemById(checkinId, pickedCheckinItem);
};

/**
 * 根据id删除checkin条目
 * @param chckinId
 * @returns {Promise.<TResult>}
 */
pub.destroy = (chckinId) => {
  return checkinSchema.destroyItem(chckinId);
};

/**
 * 创建打卡记录
*
 * @param checkinItem
 * @returns {checkinItem}
 */
pub.create = (checkinItem) => {
  return checkinSchema.createItem(checkinItem);
};

/**
 * 统计单个用户的打卡天数
 */
pub.sumCheckinDay = (userId) => {
  return checkinSchema.aggregate([{$match: {'userId': userId}},
    {$project: {checkinTime: {$substr: ["$checkinTime", 0, 10]}}},
    {$group: {_id: "$checkinTime"}},
    {$group: {_id: null, count: {$sum: 1}}}]);
};

module.exports = pub;
