'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const winston = require('winston');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const clazzUtil = require('./util/clazz.util');

const clazzPlayMapper = require('../dao/mongodb_mapper/clazzRolePlay.mapper');
const clazzAccountRecordMapper = require('../dao/mysql_mapper/clazzAccountRecord.mapper');

const pub = {};

pub.queryClazzPlayListByClazzAccountId = (clazzItem, clazzAccountId) => {
  if (!_.isPlainObject(clazzItem) || !_.isInteger(clazzAccountId)) {
    winston.error('查询课程对话体列表失败，参数错误：clazzItem: %j，clazzAccountId: %j', clazzItem, clazzAccountId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(clazzItem);
  debug(clazzAccountId);

  const clazzId = clazzItem.id,
      clazzType = clazzItem.clazzType;

  debug(clazzId);
  debug(clazzType);

  const fetchPlayListPromise = clazzPlayMapper.queryAll({ clazz: clazzId, targetDate: { '$lte': new Date() } });
  const queryClazzAccountRecordListPromise = (clazzType === enumModel.clazzTypeEnum.LONG_TERM.key)
      ? clazzAccountRecordMapper.queryClazzAccountRecordList({ clazzAccountId: clazzAccountId })
      : Promise.resolve([{ startDate: null, endDate: null }]);

  return Promise.all(([fetchPlayListPromise, queryClazzAccountRecordListPromise]))
      .then(([playList, clazzAccountRecordList]) => {
        debug(playList);
        debug(clazzAccountRecordList);

        const filteredPlayList = _.filter(
            playList,
            (playItem) => clazzUtil.checkDateIsWithinClazzRange(playItem.targetDate, clazzAccountRecordList)
        );

        debug(filteredPlayList);

        return filteredPlayList;
      });
};

pub.fetchClazzPlayById = (clazzId, clazzPlayId) => {
  if (!_.isString(clazzId) || !_.isString(clazzPlayId)) {
    winston.error('查询课程对话体详情失败，参数错误：clazzId: %j，clazzPlayId: %j', clazzId, clazzPlayId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(clazzId);
  debug(clazzPlayId);

  return clazzPlayMapper.fetchById(clazzPlayId)
      .then((clazzPlayItem) => {
        if (_.isNil(clazzPlayItem) || clazzPlayItem.clazz !== clazzId) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        return clazzPlayItem;
      });
};

pub.queryPagedClazzPlayList = (clazzId, pageNumber = 1, pageSize = 10) => {
  if (!_.isString(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('查询课程对话体分页列表失败，参数错误：clazzId: %j, pageNumber: %s, pageSize: %s', clazzId, pageNumber, pageSize);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzPlayMapper.queryPaged({ clazz: clazzId }, pageNumber, pageSize);
};

pub.createClazzPlay = (clazzPlay) => {
  if (!_.isPlainObject(clazzPlay) || !_.isString(clazzPlay.clazz)) {
    winston.error('新建课程对话体失败，参数错误：clazzPlay: %j', clazzPlay);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzPlayMapper.create(clazzPlay);
};

pub.updateClazzPlayById = (clazzPlay) => {
  if (!_.isPlainObject(clazzPlay) || !_.isString(clazzPlay.id) || !_.isString(clazzPlay.clazz)) {
    winston.error('更新课程对话体失败，参数错误：clazzPlay: %j', clazzPlay);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzPlayMapper.update(clazzPlay.id, clazzPlay);
};

pub.destroyClazzPlayById = (clazzPlayId) => {
  if (!_.isString(clazzPlayId)) {
    winston.error('删除课程对话体失败，参数错误：clazzPlayId: %j', clazzPlayId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzPlayMapper.deleteById(clazzPlayId);
};

module.exports = pub;
