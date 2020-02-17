"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require('lodash');
const debug = require('debug')('mapper');

const userSchema = require('./schema/user.schema');
const queryUtil = require('../util/queryUtil');
const mongoUtil = require('../util/mongoUtil');

const pub = {};

/**
 * 清空表
 */
pub.emptyCollection = () => {
  console.log('清空用户数据')
  return userSchema.deleteMany({});
}

/**
 * 插入数据
 */
pub.insertAll = (userList) => {
  return userSchema.insertMany(userList);
}

module.exports = pub;
