'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');
const ObjectId = require('mongoose').Types.ObjectId;

const clazzActivityRoomRecordSchema = require('./schema/clazzActivityRoomRecord.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAM_LIST = ['clazzActivityRoom', 'createdAt'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['userId', 'messageType', 'createdAt']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

const pub = {};

/**
 * 创建活动房间
 *
 * @param activityRoomRecordItem
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.create = (activityRoomRecordItem) => {
  debug(activityRoomRecordItem);

  return clazzActivityRoomRecordSchema.createItem(activityRoomRecordItem);
};

/**
 * 对roomIdList房间列表内的 用户id -> 消息计数 map
 *
 * @param roomIdList
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.countUserActivityInRoomList = (roomIdList) => {
  debug(roomIdList);

  return clazzActivityRoomRecordSchema.aggregate([
        {
          $match: { clazzActivityRoom: { '$in': _.map(roomIdList, ObjectId) } }
        },
        {
          $group: { '_id': '$userId', count: { $sum: 1 } }
        }
      ])
      .then((countList) => {
        debug(countList);

        return _.reduce(
            countList,
            (userIdCountMap, userCount) => {
              userIdCountMap[userCount['_id']] = userCount['count'];

              return userIdCountMap;
            },
            {}
        );
      })
};

/**
 * 查询房间聊天信息
 *
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return clazzActivityRoomRecordSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY);
};

module.exports = pub;
