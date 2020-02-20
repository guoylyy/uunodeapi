"use strict";

/**
 * clazz数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');

const clazzSchema = require('./schema/clazz.schema');
const queryUtil = require('../util/queryUtil');

const QUERY_SAFE_PARAM_LIST = ['status', '_id', 'configuration.teacherOpenIds', 'clazzType', 'startDate', 'endDate', 'name'];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  'name', 'description', 'status', 'banner', 'smallBanner', 'teacherHead', 'bindTeacherId', 'tags',
  'startDate', 'endDate', 'author', 'updatedAt', 'clazzType', 'isShow', 'isHot',
  'configuration.clazzType', 'configuration.taskCount', 'configuration.startHour', 'configuration.endHour', 'configuration.hasTheOneFeedback',
  'configuration.strategyLink','configuration.promotionOffer', 'configuration.totalFee', 'configuration.originFee', 'configuration.priceList',
    'configuration.robot'
]);

const QUERY_SORT_BY = queryUtil.disposeSortBy([{ column: 'updatedAt', isDescending: true }]);

/**
 * 处理课程条目
 * 1. leanId
 * 2. 设置isShow
 * @param clazzItem
 */
const parseClazzItem = (clazzItem) => {
  if (_.isNil(clazzItem)) {
    return null;
  }

  // 设置是否显示，默认显示
  clazzItem.isShow = _.get(clazzItem, 'isShow', true);

  _.forEach(clazzItem.configuration.priceList, (priceItem) => {
    if (_.isNil(priceItem.name)) {
      if (priceItem.months === 0) {
        priceItem.name = '免费';
      } else {
        priceItem.name = `${ priceItem.months }个月`;
      }
    }
  });

  return clazzItem;
};

const pub = {};

/**
 * 分页查询班级数据
 * @param queryParam
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.query = (queryParam) => {
  return clazzSchema.queryList(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, QUERY_SORT_BY)
      .then((clazzList) => {
        debug('clazzes size: %d', _.size(clazzList));

        return _.map(clazzList, parseClazzItem);
      });
};

/**
 * 分页获取班级列表
 *
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.queryPageClazzList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return clazzSchema.queryPaged(queryParam, QUERY_SAFE_PARAM_LIST, QUERY_SELECT_COLUMNS, pageNumber, pageSize, QUERY_SORT_BY)
      .then((result) => {
        result.values = _.map(result.values, parseClazzItem);

        return result;
      });
};

/**
 * 根据clazzId获取班级信息
 *
 * @param clazzId
 * @returns {Promise.<TResult>}
 */
pub.fetchById = (clazzId) => {
  return clazzSchema.findItemById(clazzId).then(parseClazzItem);
};

/**
 * 创建班级信息
 *
 * @param clazzItem
 * @returns {checkinItem}
 */
pub.create = (clazzItem) => {
  return clazzSchema.createItem(clazzItem).then(parseClazzItem);
};

/**
 * 根据id将更新班级信息
 *
 * @param clazzId
 * @param clazzItem
 * @returns {Promise.<TResult>}
 */
pub.updateById = (clazzId, clazzItem) => {
  debug(clazzId);
  debug("updateItemById");
  debug(clazzItem);

  return clazzSchema.updateItemById(clazzId, clazzItem).then(parseClazzItem);
};

module.exports = pub;
