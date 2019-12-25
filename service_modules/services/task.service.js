'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');
const taskMapper = require('../dao/mongodb_mapper/task.mapper')
const commonError = require('./model/common.error');

const pub = {};

/**
 * 分页查询课程列表
 */
pub.queryTaskList = (queryParam) => {
    return taskMapper.queryPagedTaskList(queryParam, queryParam.pageNumber, queryParam.pageSize)
}

pub.fetchById = (taskId) => {
    if (_.isNil(taskId)) {
        winston.error('获取任务详情失败，参数错误！！！ taskId: %s', taskId);
        return Promise.reject(commonError.PARAMETER_ERROR());
      }
    return taskMapper.findById(taskId);
}

module.exports = pub;