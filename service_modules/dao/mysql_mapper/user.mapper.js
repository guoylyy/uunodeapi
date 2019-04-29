'use strict';

/**
 * user数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const winston = require('winston');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const userSchema = require('./schema/user.schema');

/**
 * 处理关键词查询
 * 构造 学号 或 姓名 like keyword
 *
 * @param query     knex query builder
 * @param keyword   关键词
 */
const digestUserKeyword = (query, keyword) => {
  if (_.isString(keyword) && keyword != '') {
    let likeKeyWord = '%' + keyword + '%';

    query.andWhere(function () {
      this.where('studentNumber', 'LIKE', likeKeyWord)
          .orWhere('name', 'LIKE', likeKeyWord);
    });
  }
  return query;
};

const parseUserFields = (userItem) => {
  if (_.isNil(userItem)) {
    return null;
  }

  if (!_.isNil(userItem.hasFillInfo)) {
    userItem.hasFillInfo = userItem.hasFillInfo == '1';
  }

  if (_.isNil(userItem.isSubscribe)) {
    userItem.isSubscribe = userItem.isSubscribe == '1';
  }

  return userItem;
};

const pub = {};

const QUERY_SAFE_PARAMS = ['id', 'studentNumber', 'name'];
const QUERY_SELECT_COLUMNS = ['id', 'studentNumber', 'name', 'headImgUrl', 'openId'];

/**
 * 根据用户openId, id获取用户信息
 *
 * @param queryParam
 * @param orderByColumn
 * @returns {Promise}
 */
pub.fetchByParam = (queryParam, orderByColumn = '-updatedAt') => {
  const safeParams = ['openId', 'id', 'unionid', 'studentNumber'];

  return userSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, safeParams)
      })
      .orderBy(orderByColumn)
      .fetch()
      .then((userItem) => {
            debug(userItem);
            if (_.isNil(userItem)) {
              return null;
            }

            return parseUserFields(userItem.toJSON());
          }
      )
};

/**
 * 查询用户列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAll = (queryParam) => {

  return userSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
        digestUserKeyword(query, queryParam.keyword);
      })
      .fetchAll({ columns: QUERY_SELECT_COLUMNS })
      .then((userItemList) => {
            debug(userItemList);

            if (!userItemList) {
              return [];
            }

            return userItemList.toJSON();
          }
      )
};

/**
 * 查询分页用户列表
 *
 * @param queryParam
 * * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPageUsers = (queryParam, pageNumber, pageSize) => {
  return userSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
        digestUserKeyword(query, queryParam.keyword);
      })
      .fetchPage({
        columns: QUERY_SELECT_COLUMNS,
        page: pageNumber,
        pageSize: pageSize
      })
      .then((result) => {
            debug(result.toJSON());

            return {
              values: result.toJSON(),
              itemSize: result.pagination.rowCount,
              pageSize: result.pagination.pageSize,
              pageNumber: result.pagination.page
            };
          }
      );
};

const safePrivacyFields = [
  'id', 'name', 'headImgUrl', 'openId', 'unionid', 'studentNumber', 'birthday',
  'sex', 'city', 'phoneNumber', 'wechat', 'alipay',
  'hasFillInfo', 'timezone', 'saltHashedPassword', 'realName', 'timezoneUpdatedAt',
  'isSubscribe', 'invitatedBy', 'target'
];

/**
 * 更新私有信息
 * @param userItem
 * @returns {*}
 */
pub.update = (userItem) => {
  if (_.isNil(userItem) || _.isNil(userItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickedPrivacy = _.pick(userItem, safePrivacyFields);
  debug(pickedPrivacy);

  return userSchema.forge(pickedPrivacy)
      .save(null, {
        method: 'update'
      })
      .then((userModel) => userSchema.forge({ id: userModel.id }).fetch())
      .then((userModel) => {
        debug('Saved user: %j', userModel);

        return parseUserFields(userModel.toJSON());
      })
};

const safeCreateFields = ['name', 'headImgUrl', 'openId', 'unionid', 'studentNumber', 'invitatedBy', 'saltHashedPassword',
  'sex', 'city', 'hasFillInfo', 'address', 'wechat', 'alipay', 'phoneNumber', 'realName', 'timezone', 'invitations', 'isSubscribe', 'target'];
/**
 * 创建新的用户
 *
 * @param userItem
 * @returns {*}
 */
pub.create = (userItem) => {
  if (_.isNil(userItem) || !_.isNil(userItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  let pickedUserItem = _.pick(userItem, safeCreateFields);

  return userSchema.forge(pickedUserItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((userModel) => {
        debug('Created user: %j', userModel);

        return parseUserFields(userModel.toJSON());
      });
};

module.exports = pub;
