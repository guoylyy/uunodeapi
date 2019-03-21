'use strict';

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const _ = require('lodash');
const winston = require('winston');
const debug = require('debug')('mapper');

const queryUtil = require('../util/queryUtil');
const postSchema = require('./schema/post.schema');

/**
 * 处理关键词查询
 * 构造 学号 或 姓名 like keyword
 *
 * @param query     knex query builder
 * @param keyword   关键词
 */
const digestKeyword = (query, keyword) => {
  if (_.isString(keyword) && keyword != '') {
    let likeKeyWord = '%' + keyword + '%';

    query.andWhere(function () {
      this.where('title', 'LIKE', likeKeyWord);
    });

    return query;
  }
};

/**
 * 处理Post中的字段
 * 1. result -> JSON.parse
 *
 * @param postItem
 * @returns {*}
 */
const parseFields = (postItem) => {
  if (_.isNil(postItem)) {
    return postItem;
  }

  if (!_.isNil(postItem.result)) {
    postItem.result = JSON.parse(postItem.result);
  }

  if (!_.isNil(postItem.stickied)) {
    postItem.stickied = (postItem.stickied !== 0);
  }

  debug(postItem);

  return postItem;
};

let pub = {};

const QUERY_SAFE_PARAMS = ['id', 'clazzId', 'status', 'targetDate', 'title'];
const DEFAULT_SELECT_COLUMNS = ['id', 'clazzId', 'status', 'title', 'postType', 'targetDate', 'target', 'result', 'stickied'];
/**
 * 分页查询推送任务列表
 *
 * @param queryParam
 * @param pageSize
 * @param pageNumber
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPagePosts = (queryParam, pageSize, pageNumber) => {

  return postSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
        digestKeyword(query, queryParam.keyword);
      })
      .orderBy('targetDate', 'desc')
      .fetchPage({
        columns: DEFAULT_SELECT_COLUMNS,
        page: pageNumber,
        pageSize: pageSize
      })
      .then((result) => {
        debug(result);

        if (!result) {
          return null;
        }

        return {
          values: _.map(result.toJSON(), parseFields),
          itemSize: result.pagination.rowCount,
          pageSize: result.pagination.pageSize,
          pageNumber: result.pagination.page
        };
      });
};

/**
 * 查询所有满足条件的推送任务
 *
 * @param queryParam
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAllPosts = (queryParam) => {

  return postSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, QUERY_SAFE_PARAMS);
      })
      .orderBy('targetDate', 'desc')
      .fetchAll({ columns: DEFAULT_SELECT_COLUMNS })
      .then((postList) => {
        debug(postList);

        return _.map(postList.toJSON(), parseFields);
      });
};

/**
 * 新建推送任务
 *
 * @param postItem
 * @returns {*}
 */
pub.create = (postItem) => {
  if (!_.isPlainObject(postItem) || !_.isNil(postItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }
  debug(postItem);

  return postSchema.forge(postItem)
      .save(null, {
        transacting: true,
        method: 'insert'
      })
      .then((postItem) => {
        debug('Created post: %j', postItem);

        return parseFields(postItem.toJSON());
      });
};

/**
 * 查询post
 *
 * @param queryParams
 * @returns {Promise}
 */
pub.fetchPostByParams = (queryParams) => {
  return postSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParams, QUERY_SAFE_PARAMS)
      })
      .orderBy('targetDate', 'desc')
      .fetch()
      .then((postItem) => {
        debug(postItem);

        if (_.isNil(postItem)) {
          return null;
        }

        return parseFields(postItem.toJSON());
      });
};

const UPDATE_SAFAE_FIELDS = ['id', 'status', 'result'];
/**
 * 更新信息
 * @param postItem
 * @returns {*}
 */
pub.update = (postItem) => {
  if (!_.isPlainObject(postItem) || _.isNil(postItem.id)) {
    return Promise.reject(new Error('参数错误'));
  }

  // 过滤字段
  let pickedPostItem = _.pick(postItem, UPDATE_SAFAE_FIELDS);
  debug(pickedPostItem);

  return postSchema.forge(pickedPostItem)
      .save(null, {
        transacting: true,
        method: 'update'
      })
      .then((postItem) => {
        debug('Updated Post: %j', postItem);

        return parseFields(postItem.toJSON());
      });
};

/**
 * 删除 postId
 *
 * @param postId
 * @returns {Promise.<TResult>|Promise}
 */
pub.destroy = (postId) => {
  if (_.isNil(postId)) {
    return Promise.reject(new Error('参数错误'));
  }

  debug('Ready to destroy: %d', postId);
  return postSchema.forge({ id: postId })
      .destroy({
        transacting: true
      })
      .then((result) => {
        debug(result);

        return parseFields(result.toJSON());
      })
};

module.exports = pub;
