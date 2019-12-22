'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');
const lessonMapper = require('../dao/mongodb_mapper/lesson.mapper')
const commonError = require('./model/common.error');

const pub = {};

/**
 * 分页查询课程列表
 */
pub.queryLessonList = (queryParam) => {
    return lessonMapper.queryPagedLessonList(queryParam, queryParam.pageNumber, queryParam.pageSize)
}

module.exports = pub;