'use strict';
/**
 * mongo mapper层常用方法
 */
const _ = require('lodash');
const ObjectId = require('mongoose').Types.ObjectId;
const debug = require('debug')('util');

const pub = {};

/**
 * 1. 将objectId格式转换成string
 * 2. 将mongodb中_id转化成id
 * @param item
 */
pub.leanId = (item) => {
  debug('-----  leanId ------');
  if (_.isNil(item)) {
    return item;
  }

  debug(item);

  let newItem = item;
  if (item.toObject) {
    newItem = item.toObject();
  }

  newItem = _.mapValues(newItem, (value) => {
    // 将mongo objectId转换成string
    if (value instanceof ObjectId) {
      return value.toString();
    } else if (_.isArray(value)) {
      return _.map(value, (item) => {

        if (item instanceof ObjectId) {
          return item.toString();
        } else if (!_.isDate(item) && _.isObject(item)) {
          return pub.leanId(item);
        } else {
          return item;
        }
      });
    } else if (!_.isDate(value) && _.isObject(value)) {
      return pub.leanId(value);
    } else {
      return value;
    }
  });

  newItem.id = newItem._id;

  debug(newItem);

  return _.omit(newItem, '_id');
};

/**
 * 过滤Item并设置updatedAt为当前时间
 *
 * @param item
 * @param safeParams
 */
pub.pickUpdateParams = (item, safeParams) => {
  let pickItem = _.pick(item, safeParams);

  // 更新 updatedAt 为 当前时间
  pickItem.updatedAt = new Date();

  return pickItem;
};

module.exports = pub;
