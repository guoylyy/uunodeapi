'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('mapper');

const queryUtil = require('./util/queryUtil');
const mongoUtil = require('./util/mongoUtil');

/**
 * 在保存前更新updatedAt字段为当前日期
 * @param schema
 */
function lastModifiedPlugin(schema) {
  schema.add({
    createdAt: Date,
    updatedAt: Date,
    isDelete: { type: Boolean, required: true, default: false },
  });

  function updateTimeStamps(next) {
    // 获取当前日期
    let currentDate = new Date();

    // 更新updatedAt字段
    this.updatedAt = currentDate;

    // 如果createdAt为空，则设置为当前时间
    if (!this.createdAt) {
      this.createdAt = currentDate;
    }

    next()
  }

  schema.pre('save', updateTimeStamps);
  schema.pre('update', updateTimeStamps);
}

/**
 * 处理保存时的错误，返回有效的错误信息
 * @param schema
 */
function saveErrorHandlerPlugin(schema) {
  schema.post('save', function (error, doc, next) {
    debug('%j', error);

    if (error.name === 'ValidationError') {
      // 获取第一个错误信息
      let message = _.get(error, 'message', '参数错误');
      debug(message);

      return next(new Error(message));
    } else if (error.name === 'MongoError' && error.code === 11000) {
      return next(new Error('There was a duplicate key error'));
    } else {
      return next(error);
    }
  });
}


function paginatePlugin(schema) {
  schema.statics.paginate = function (query, options) {
    query = query || {};
    options = options || {};

    let select = options.select;
    let sort = options.sort;
    let populate = options.populate;
    let lean = options.lean || false;
    let leanWithId = options.hasOwnProperty('leanWithId') ? options.leanWithId : true;

    let limit = options.hasOwnProperty('limit') ? options.limit : 10;
    let skip, page;

    if (options.hasOwnProperty('pageNumber')) {
      page = options.pageNumber;
      skip = (page - 1) * limit;
    } else {
      page = 1;
      skip = 0;
    }

    let promises = [this.count(query).exec()];

    if (limit) {
      let mongoQuery = this.find(query)
          .select(select)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(lean);

      if (populate) {
        _.forEach(populate, (item) => {
          mongoQuery.populate(item);
        });
      }

      let fetchDocsPromise = mongoQuery.exec();

      if (lean && leanWithId) {
        fetchDocsPromise = fetchDocsPromise.then((docs) => {
          _.forEach(docs, (doc) => {
            doc.id = String(doc._id);
          });

          return docs;
        });
      }

      promises.push(fetchDocsPromise);
    }

    return Promise.all(promises)
        .then((data) => {
          let count = data[0],
              docs = data[1];

          return {
            values: docs,
            itemSize: count,
            pageNumber: page,
            pageSize: limit
          };
        });
  }
}

/**
 * 基本的增删改查plugin，提供：
 * 1. create      创建
 * 2. query       查询列表
 * 3. findById    根据id查询
 * 4. findByParam 根据参数查询
 * 5. updateById  更新
 * 6. destroy     删除
 * @param schema
 */
function baseCRUDPlugin(schema) {
  /**
   * 创建条目
   *
   * @param item
   */
  schema.statics.createItem = function (item) {
    return this.create(item)
        .then((modelItem) => {
          debug('------- create success -------');
          debug(modelItem);

          return mongoUtil.leanId(modelItem);
        });
  };

  /**
   * 查询列表
   *
   * @param queryParam
   * @param safeParamList
   * @param selectColumns
   * @param sortBy
   * @returns {Promise.<TResult>}
   */
  schema.statics.queryList = function (queryParam, safeParamList, selectColumns, sortBy = '-createdAt') {
    debug(queryParam);

    const options = queryUtil.filterMongoQueryParam(queryParam, safeParamList);
    options.isDelete = { '$ne': true };

    debug(options);

    return this.find(options, selectColumns)
        .sort(sortBy)
        .lean(true)
        .exec()
        .then((itemList) => {
          debug('------- query success -------');
          debug(itemList);

          return _.map(itemList, mongoUtil.leanId);
        });
  };

  /**
   * 根据id查询
   *
   * @param itemId
   * @returns {Promise.<TResult>}
   */
  schema.statics.findItemById = function (itemId) {
    return this.findById(itemId)
        .lean(true)
        .exec()
        .then((modelItem) => {
          debug('------- findById success -------');
          debug(modelItem);

          return mongoUtil.leanId(modelItem);
        });
  };

  /**
   * 根据参数查询
   *
   * @param queryParams
   * @param safeParamList
   * @param sortBy
   * @returns {Promise.<TResult>}
   */
  schema.statics.findItemByParam = function (queryParams, safeParamList, sortBy = '-createdAt') {
    const queryConditions = queryUtil.filterMongoQueryParam(queryParams, safeParamList);

    queryConditions.isDelete = { '$ne': true };

    return this.findOne(queryConditions)
        .sort(sortBy)
        .lean(true)
        .exec()
        .then((item) => {
          debug('------- findByParam success -------');
          debug(item);

          return mongoUtil.leanId(item);
        });
  };

  /**
   * 更新条目
   *
   * @param itemId
   * @param item
   * @returns {Promise.<TResult>}
   */
  schema.statics.updateItemById = function (itemId, item) {
    // 更新updatedAt
    item.updatedAt = new Date();

    return this.findByIdAndUpdate(itemId, item, { new: true })
        .lean(true)
        .exec()
        .then((updatedItem) => {
          debug('------- update success -------');
          debug(updatedItem);

          return mongoUtil.leanId(updatedItem);
        });
  };

  /**
   * 销毁
   *
   * @param itemId
   * @returns {Promise.<TResult>}
   */
  schema.statics.destroyItem = function (itemId) {
    return this.findByIdAndUpdate(itemId, { isDelete: true, updatedAt: new Date() }, { new: true })
        .lean(true)
        .exec()
        .then((destroyedItem) => {
          debug('------- delete success -------');
          debug(destroyedItem);

          return mongoUtil.leanId(destroyedItem);
        });
  };

  schema.statics.queryPaged = function (queryParam,
                                        QUERY_SAFE_PARAM_LIST = [],
                                        QUERY_SELECT_COLUMNS = [],
                                        pageNumber = 1,
                                        pageSize = 10,
                                        QUERY_SORT_BY = '-createdAt') {
    const queryConditions = queryUtil.filterMongoQueryParam(queryParam, QUERY_SAFE_PARAM_LIST);
    // 只查询未删除的对话体
    queryConditions.isDelete = { '$ne': true };

    debug(queryConditions);

    return this.paginate(
        queryConditions,
        {
          pageNumber: pageNumber,
          limit: pageSize,
          select: QUERY_SELECT_COLUMNS,
          sort: QUERY_SORT_BY,
          lean: true,
          leanWithId: true
        })
        .then((result) => {
          debug('paged list size: %d', _.size(result.values));

          result.values = _.map(result.values, mongoUtil.leanId);

          return result;
        });
  };
}

exports.lastModifiedPlugin = lastModifiedPlugin;
exports.saveErrorHandlerPlugin = saveErrorHandlerPlugin;
exports.paginatePlugin = paginatePlugin;
exports.baseCRUDPlugin = baseCRUDPlugin;
