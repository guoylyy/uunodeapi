'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const userLikeMapper = require('../dao/mysql_mapper/userLike.mapper');

let pub = {};

/**
 * 获取用户在一个业务下的笔芯统计
 * @param userId
 * @param appType
 */
pub.fetchUserLikeStaticitcs = (userId, appType) =>{

};

/**
 * 分页获取用户笔芯记录
 * @param userId
 * @param pageNumber
 * @param pageSize
 * @param appType
 */
pub.fetchUserLikesByPage = (userId, pageNumber, pageSize, appType)=>{

};

/**
 * 获取用户笔芯规则
 * @param userId
 * @param appType
 */
pub.fetchUserLikeRules = (userId, appType) =>{

};

/**
 * 获取用户笔芯相关记录列表
 * @param userId
 * @param appType
 */
pub.fetchUserLikeFromTasks = (userId, taskKeys, appType) =>{

};

module.exports = pub;
