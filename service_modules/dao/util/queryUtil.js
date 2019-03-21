"use strict";

/**
 * clazz数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
let _ = require('lodash');
let winston = require('winston');
let debug = require('debug')('util');

let pub = {};

pub.filterMongoQueryParam = (queryParam, safeParamList) => {
  let options = _.reduce(
      queryParam,
      (options, value, key) => {
        if (_.includes(safeParamList, key)) {
          if (_.isArray(value)) {
            options[key] = { '$in': value };
          } else if (!_.isNil(value)) {
            options[key] = value;
          } else {
            options[key] = { '$eq': null };
          }
        }

        return options;
      },
      {}
  );

  debug('options: ', options);

  return options;
};

pub.disposeSelectColumn = (selectColumnList) => {
  let selectList = _.join(selectColumnList, ' ');
  debug(selectList);
  return selectList;
};

pub.disposeSortBy = (sortBy) => {
  let sortByStr = _.chain(sortBy)
      .reduce(
          (sortList, sort) => {
            if (sort.isDescending) {
              sortList.push('-' + sort.column);
            } else {
              sortList.push(sort.column);
            }
            return sortList;
          },
          []
      )
      .join(' ')
      .value();

  debug(sortByStr);
  return sortByStr;
};

/**
 * 构建Mysql查询对象的方法
 * @param query
 * @param queryParam
 * @param safeParamList
 * @return {*}
 */
pub.filterMysqlQueryParam = (query, queryParam, safeParamList) => {
  _.forEach(queryParam, (value, key) => {
    if (_.includes(safeParamList, key)) {
      if (_.isArray(value)) {
        query = query.whereIn(key, value);
      } else if (_.isPlainObject(value)) {
        if (value.operator === 'is not' && _.isNil(value.value)) {
          query = query.where(key, 'is not', null);
        } else if (_.isString(value.operator) && !_.isNil(value.value)) {
          const operator = value.operator,
              operatorValue = value.value;

          if (operator === 'and') {
            _.each(operatorValue, (item) => {
              query = query.where(key, item.operator, item.value);
            })
          } else {
            query = query.where(key, value.operator, value.value);
          }
        } else {
          winston.error('mysql查询参数错误， Object对象需要有operator和value！！！，参数为: %j', value);
        }
      } else {
        query = query.where(key, value);
      }
    }
  });

  return query;
};

module.exports = pub;
