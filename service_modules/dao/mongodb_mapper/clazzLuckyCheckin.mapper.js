"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const clazzLuckyCheckinSchema = require('./schema/clazzLuckyCheckin.schema');

const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAM_LIST = ['clazz', 'date'];
const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'date', isDescending: true }]);

const pub = {};

/**
 * 根据参数查询班级打卡抽取记录
 *
 * @param queryParam
 * @returns {Promise.<TResult>}
 */
pub.fetchByPrams = (queryParam) => {
  return clazzLuckyCheckinSchema.findItemByParam(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SORT_BY);
};

/**
 * 创建班级打卡抽取记录
 *
 * @param clazzLuckyCheckinItem
 * @returns {checkinItem}
 */
pub.create = (clazzLuckyCheckinItem) => {
  return clazzLuckyCheckinSchema.createItem(clazzLuckyCheckinItem);
};

/**
 * 根据id查询班级打卡抽取记录
 *
 * @param clazzLuckyCheckinId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (clazzLuckyCheckinId) => {
  return clazzLuckyCheckinSchema.findItemById(clazzLuckyCheckinId);
};

module.exports = pub;
