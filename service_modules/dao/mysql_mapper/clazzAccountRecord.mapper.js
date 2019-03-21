/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
'use strict';

const _ = require('lodash');
const debug = require('debug')('mapper');

const clazzAccountRecordSchema = require('./schema/clazzAccountRecord.schema');
const queryUtil = require('../util/queryUtil');

const pub = {};

const QUERY_SAFE_PARAMS = ['clazzAccountId', 'clazzId'];
const QUERY_SELECT_COLUMNS = ['id', 'startDate', 'endDate'];

/**
 * 查询ClazzAccountRecord记录列表
 *
 * @param queryParams
 * @returns {Promise}
 */
pub.queryClazzAccountRecordList = (queryParams) => {
  return clazzAccountRecordSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, QUERY_SAFE_PARAMS)
      })
      .orderBy('createdAt', 'desc')
      .fetchAll({ columns: QUERY_SELECT_COLUMNS })
      .then((clazzAccountRecordList) => {
        return clazzAccountRecordList.toJSON();
      });
};


/**
 * 新建长期班班级账单记录
 *
 * @param clazzAccountRecordItem
 * @returns {*}
 */
pub.create = (clazzAccountRecordItem) => {
  if (!_.isPlainObject(clazzAccountRecordItem) || !_.isNil(clazzAccountRecordItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }
  debug(clazzAccountRecordItem);

  return clazzAccountRecordSchema.forge(clazzAccountRecordItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((clazzAccountRecordSchema) => {
        debug('Created clazz_account_record: %j', clazzAccountRecordSchema);

        return clazzAccountRecordSchema.toJSON();
      });
};

const UPDATE_SAFE_FIELDS = ['id', 'endDate', 'userId'];
/**
 * 更新信息
 * @param clazzAccountRecordItem
 * @returns {*}
 */
pub.update = (clazzAccountRecordItem) => {
  if (!_.isPlainObject(clazzAccountRecordItem) || _.isNil(clazzAccountRecordItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  const pickeClazzAccountRecordItem = _.pick(clazzAccountRecordItem, UPDATE_SAFE_FIELDS);
  debug(pickeClazzAccountRecordItem);

  return clazzAccountRecordSchema.forge(pickeClazzAccountRecordItem)
      .save(null, {
        transacting: true,
        method: 'update'
      })
      .then((clazzAccountItem) => {
        debug('Updated clazz_account_record: %j', clazzAccountItem);

        return clazzAccountItem.toJSON();
      });
};

/**
 * 删除班级账户记录
 *
 * @param clazzAccountRecordId
 * @returns {*}
 */
pub.delete = (clazzAccountRecordId) => {
  if (_.isNil(clazzAccountRecordId)) {
    return Promise.reject(new Error('参数错误'));
  }

  return clazzAccountRecordSchema.deleteById(clazzAccountRecordId);
};

module.exports = pub;
