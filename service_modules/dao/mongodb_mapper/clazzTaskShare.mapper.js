"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const clazzTaskShareSchema = require('./schema/clazzTaskShare.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAMS = ['clazzTask','clazzId','userId','shareDate'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn(['clazzTask','clazzId','userId','shareDate']);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

const pub = {};


/**
 * 创建任务回复记录
 *
 * @param replyItem
 * @returns {*|Promise.<TResult>|Promise}
 */
pub.create = (Item) => {
  return clazzTaskShareSchema.createItem(Item);
};


/**
 * 查询用户的分享记录
 * @type {{}}
 */
pub.queryShares = (queryParams) => {
  return clazzTaskShareSchema.queryList(queryParams, QUERY_SAFE_PARAMS, QUERY_SELECT_COLUMNS, QUERY_ORDER_BY)
};

/**
 * 根据条件count记录
 * @type {{}}
 */
pub.countShares = (queryParams) => {
  return clazzTaskShareSchema.count(queryParams);
};


module.exports = pub;
