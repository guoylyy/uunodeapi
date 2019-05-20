'use strict';
/**
 * 为mysql部分的data model提供基础功能
 * 通用的方法可以提取到这里
 *
 * @class BaseSchema
 */
const _ = require('lodash');
const debug = require('debug')('schema');
const Joi = require('joi');

const joiCustomizeLanguage = require('../../../lib/joi.customized');

const bookshelf = require('../../mysql.connection');

function ValidationError(message, err) {
  this.name = 'ValidationError';
  this.message = message;
  this.err = err;
}

ValidationError.prototype = new Error();

let pub = {};

/**
 * 定义基本的Bookshelf model
 * @type {*}
 */
pub.BaseBookshelfModel = bookshelf.Model.extend(
    {
      hasTimestamps: ['createdAt', 'updatedAt'],
      initialize: function () {

        if (this.createSchema) {
          this.on('creating', this.validateCreate, this);
        }

        if (this.updateSchema) {
          this.on('updating', this.validateUpdate, this);
        }
      },

      /**
       * Validates data with a schema
       * @throws {ValidationError}
       */
      validateWith: function (schema) {
        let result = Joi.validate(this.changed, schema, { language: joiCustomizeLanguage });

        if (result.error) {
          debug(result.error);

          let message = _.get(result.error.details, '0.message', '参数错误');

          throw new ValidationError(message, result.error);
        }

        // Set updated values
        this.set(result.value);
      },

      /**
       * Validates upon creation
       * @throws {ValidationError}
       */
      validateCreate: function () {
        this.validateWith(this.createSchema);
      },

      /**
       * Validates upon update
       * @throws {ValidationError}
       */
      validateUpdate: function () {
        this.validateWith(this.updateSchema);
      }
    },
    {
      /**
       * 新建条目
       *
       * @param item
       */
      create: function (item) {
        try {
          return this.forge(item)
              .save(null, {
                method: 'insert'
              })
              .then((model) => {
                return model.toJSON()
              });
        } catch (error) {
          debug(error);

          return Promise.reject(error);
        }
      },

      /**
       * 更新条目
       *
       * @param item
       * @returns {Promise|Promise.<*>}
       */
      update: function (item) {
        try {
          return this.forge(item)
              .save(null, {
                method: 'update'
              })
              .then((model) => {
                return model.toJSON();
              })
        } catch (error) {
          debug(error);

          return Promise.reject(error);
        }
      },

      /**
       * 查询条目
       *
       * @param queryBuilder  查询参数构造函数
       * @param orderByColumn 排序属性
       */
      findOne: function (queryBuilder, orderByColumn = '-updatedAt') {
        debug(queryBuilder);

        debug(orderByColumn);
        try {
          return this.query((query) => queryBuilder(query))
              .orderBy(orderByColumn)
              .fetch()
              .then((model) => {
                debug(model);

                if (_.isNil(model)) {
                  return null;
                }

                return model.toJSON();
              });
        } catch (error) {
          debug(error);

          return Promise.reject(error);
        }

      },

      /**
       * 查询多个条目
       *
       * @param queryBuilder  查询参数构造函数
       * @param selectColumns 返回的属性列表
       * @param orderByColumn 排序属性
       */
      findAll: function (queryBuilder, selectColumns, orderByColumn = '-createdAt') {
        try {
          return this.query((query) => queryBuilder(query))
              .orderBy(orderByColumn)
              .fetchAll({ columns: selectColumns })
              .then((modelList) => {
                debug(modelList);

                if (_.isNil(modelList)) {
                  return [];
                }

                return modelList.toJSON();
              });
        } catch (error) {
          debug(error);

          return Promise.reject(error);
        }
      },

      /**
       * 计数，满足查询条件
       *
       * @param queryBuilder  查询参数构造函数
       * @returns {Promise.<*>}
       */
      countAll: function (queryBuilder) {
        try {
          return this.query((query) => queryBuilder(query)).count()
        } catch (error) {
          debug(error);

          return Promise.reject(error);
        }
      },

      /**
       * 删除记录
       *
       * @param itemId
       * @returns {Promise|Promise.<*>}
       */
      deleteById: function (itemId) {
        try {
          return this.forge({ id: itemId })
              .destroy({
              })
              .then((result) => {
                debug(result);

                return result.toJSON();
              });
        } catch (error) {
          debug(error);

          return Promise.reject(error);
        }
      },

      fetchPagedAll: function (queryBuilder, selectColumns, pageNumber = 1, pageSize = 10, orderByColumn = '-createdAt') {
        try {
          return this.query((query) => queryBuilder(query))
              .orderBy(orderByColumn)
              .fetchPage({
                columns: selectColumns,
                page: pageNumber,
                pageSize: pageSize
              })
              .then((result) => {
                debug(result);

                if (!result) {
                  return null;
                }

                return {
                  values: result.toJSON(),
                  itemSize: result.pagination.rowCount,
                  pageSize: result.pagination.pageSize,
                  pageNumber: result.pagination.page
                };
              });
        } catch (error) {
          debug(error);

          return Promise.reject(error);
        }
      }
    });

/**
 * 定义包含createdAt和updatedAt的创建Bookshelf validate格式
 * @type {*}
 */
pub.baseCreateSchema = Joi.object().keys({
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().required()
});

/**
 * 定义包含updatedAt的更新Bookshelf validate格式
 * @type {*}
 */
pub.baseUpdateSchema = Joi.object().keys({
  id: Joi.number().positive().required(),
  updatedAt: Joi.date().required()
});

module.exports = pub;
