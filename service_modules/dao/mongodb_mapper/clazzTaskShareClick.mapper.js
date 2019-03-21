"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const clazzTaskShareClickSchema = require('./schema/clazzTaskShareClick.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAMS = ['taskId','clazzId','userId','clickTime'];

const pub = {};


/**
 * 创建任务点击记录
 *
 * @param replyItem
 * @returns {*|Promise.<TResult>|Promise}
 */
pub.create = (Item) => {
  return clazzTaskShareClickSchema.createItem(Item);
};

module.exports = pub;
