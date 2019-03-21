'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const _ = require('lodash');
const clazzActivityRoom = require('./schema/clazzActivityRoom.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAM_LIST = ['_id', 'status', 'clazz', 'version', 'endDate'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['clazz', 'partnerList', 'endDate', 'activityAccountList']);
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

const pub = {};

/**
 * 创建活动房间
 *
 * @param activityRoomItem
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.create = (activityRoomItem) => {
  debug(activityRoomItem);

  return clazzActivityRoom.createItem(activityRoomItem);
};

/**
 * 根据 activityRoomId 获取活动房间信息
 *
 * @param activityRoomId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (activityRoomId) => {
  return clazzActivityRoom.findItemById(activityRoomId);
};

/**
 * 根据id将更新活动房间信息
 *
 * @param id
 * @param activityRoomItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (id, activityRoomItem) => {
  debug(id);
  debug(activityRoomItem);

  return clazzActivityRoom.updateItemById(id, activityRoomItem);
};

/**
 * 分页查询活动房间数据
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return clazzActivityRoom.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY)
      .then((activityRoomList) => {
        debug('activityRoomList size: %d', _.size(activityRoomList));
        debug(activityRoomList);

        return _.map(activityRoomList, (activityRoomItem) => {
          activityRoomItem.activityAccountList = _.map(
              activityRoomItem.activityAccountList,
              (activityAccountId) => {
                return activityAccountId.toString()
              }
          );

          return activityRoomItem;
        });
      });
};

module.exports = pub;
