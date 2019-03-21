"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const debug = require('debug')('mapper');

const clazzIntroductionSchema = require('./schema/clazzIntroduction.schema');

const pub = {};

/**
 * 根据id获取课程简介
 *
 * @param introductionId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (introductionId) => {
  return clazzIntroductionSchema.findItemById(introductionId);
};

/**
 * 创建班级简介
 *
 * @param clazzIntroductionItem
 * @returns {checkinItem}
 */
pub.create = (clazzIntroductionItem) => {
  return clazzIntroductionSchema.createItem(clazzIntroductionItem);
};

/**
 * 根据id将更新班级简介
 *
 * @param clazzIntroductionId
 * @param clazzIntroductionItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (clazzIntroductionId, clazzIntroductionItem) => {
  debug(clazzIntroductionId);
  debug(clazzIntroductionItem);

  return clazzIntroductionSchema.updateItemById(clazzIntroductionId, clazzIntroductionItem);
};

module.exports = pub;
