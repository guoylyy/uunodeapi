'use strict';

const _ = require('lodash');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const clazzRankListMapper = require('../dao/mysql_mapper/clazzRankList.mapper');
const clazzRankFavourListMapper = require('../dao/mysql_mapper/clazzRankFavourList.mapper');
const userService = require('./user.service');

/**
 * 为课程排行班匹配点赞情况
 *
 * @param clazzRankList
 * @param date
 * @param userId
 * @returns {Promise.<Array>}
 */
const matchClazzRankFavour = (clazzRankList, date, userId) => {
  if (_.isEmpty(clazzRankList)) {
    return Promise.resolve([]);
  }

  const clazzRankIdList = [], // 排行榜id列表
      userIds = [],           // 用户id列表
      clazzRankMap = {};      // 排行榜点赞map

  _.forEach(clazzRankList, (clazzRankItem) => {
    const clazzRankId = clazzRankItem.id;

    clazzRankIdList.push(clazzRankId);

    userIds.push(clazzRankItem.userId);

    // 初始化每个排行榜条目的点赞map
    clazzRankMap[clazzRankId] = {};
  });

  const queryUserListPromise = userService.queryUser(null, userIds);

  const queryClazzRankFavourListPromise = clazzRankFavourListMapper.queryAll({ clazzRankId: clazzRankIdList });

  return Promise.all([queryUserListPromise, queryClazzRankFavourListPromise])
      .then((result) => {
        const userList = result[0];
        const favourList = result[1];

        debug('----------matchClazzRankFavour-------------');
        debug(userList);
        debug(favourList);

        const todayFavourMap = {},    // 今天用户点赞排行榜map
            yesterdayEndMoment = moment().add(-1, 'days').endOf('day');

        _.forEach(
            favourList,
            (favourItem) => {
              const clazzRankId = favourItem.clazzRankId,
                  favourUserId = favourItem.userId;

              const totalFavour = _.get(clazzRankMap, [clazzRankId, favourUserId], 0);

              clazzRankMap[clazzRankId][favourUserId] = totalFavour + 1;

              if (userId === favourUserId && yesterdayEndMoment.isBefore(favourItem.favourAt)) {
                todayFavourMap[clazzRankId] = true;
              }
            }
        );

        const userMap = _.keyBy(userList, 'id');

        debug(clazzRankMap);

        return _.map(clazzRankList, (clazzRank) => {
          const rankId = clazzRank.id;
          const favourCountMap = _.get(clazzRankMap, rankId, {});

          debug(favourCountMap);

          clazzRank.userInfo = userMap[clazzRank.userId];
          clazzRank.favourInfo = {
            sum: _.sum(_.values(favourCountMap)),
            isFavour: todayFavourMap[rankId] === true
          };

          return clazzRank;
        });
      });
};

const pub = {};

/**
 * 分页查询班级排行榜
 *
 * @param clazzId
 * @param pageNumber
 * @param pageSize
 * @param date
 * @param userId
 * @returns {*}
 */
pub.queryPagedClazzRankList = (clazzId, pageNumber = 1, pageSize = 10, date, userId) => {
  if (_.isNil(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize) || !_.isDate(date) || _.isNil(userId)) {
    winston.error(
        '分页查询班级打卡排行失败，参数错误！！！clazzId: %s, pageNumber: %s, pageSize: %s, date: %s, userId: %s',
        clazzId,
        pageNumber,
        pageSize,
        date,
        userId
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzRankListMapper.queryPageClazzRanks({ clazzId: clazzId }, pageNumber, pageSize)
      .then((pageResult) => {
        debug(pageResult);

        return matchClazzRankFavour(pageResult.values, date, userId)
            .then((clazzRankList) => {
              debug(clazzRankList);

              pageResult.values = clazzRankList;

              return pageResult;
            });
      });
};

/**
 * 查询个人在班级内的排行榜记录
 *
 * @param clazzId
 * @param userId
 * @param date
 * @returns {Promise|Promise.<*>}
 */
pub.queryUserClazzRank = (clazzId, userId, date) => {
  if (_.isNil(clazzId) || _.isNil(userId) || !_.isDate(date)) {
    winston.error('获取用户排行榜记录失败，参数错误！！！clazzId: %s, userId: %s, date: %s', clazzId, userId, date)
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = {
    clazzId: clazzId,
    userId: userId
  };

  return clazzRankListMapper.fetchByParam(queryParam)
      .then((clazzRankItem) => {
        if (_.isNil(clazzRankItem)) {
          return [null]
        }

        return matchClazzRankFavour([clazzRankItem], date, userId);
      })
      .then(_.head);
};

/**
 * 根据id获取排行榜条目
 *
 * @param clazzRankId
 * @param userId
 * @param date
 * @returns {Promise|Promise.<*>}
 */
pub.fetchClazzRankById = (clazzRankId, userId, date) => {
  if (_.isNil(clazzRankId)) {
    winston.error('根据id获取排行榜记录失败，参数错误！！！clazzRankId: %s', clazzRankId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzRankListMapper.fetchByParam({ id: clazzRankId })
      .then((clazzRankItem) => {
        if (_.isNil(clazzRankItem)) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        return matchClazzRankFavour([clazzRankItem], date, userId);
      })
      .then(_.head);
};

/**
 * 点赞排行榜
 *
 * @param clazzRankId
 * @param userId
 * @returns {*}
 */
pub.createClazzRankFavourItem = (clazzRankId, userId) => {
  if (_.isNil(clazzRankId) || _.isNil(userId)) {
    winston.error('点赞排行榜条目失败，参数错误！！！clazzRankId: %s, userId: %s', clazzRankId, userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzRankFavourListMapper.create({
    clazzRankId: clazzRankId,
    userId: userId,
    favourAt: new Date()
  })
};

pub.queryAllClazzRankList = (clazzId) => {
  if (_.isNil(clazzId)) {
    winston.error('查询班级排行榜记录失败，参数错误！！！clazzId: %s', clazzId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzRankListMapper.queryAllClazzRanks({ clazzId: clazzId });
};

pub.updateClazzRankItem = (clazzRankItem) => {
  if (!_.isPlainObject(clazzRankItem) || _.isNil(clazzRankItem.id)) {
    winston.error('更新班级排行榜记录失败，参数错误！！！clazzRanKItem: %j', clazzRankItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzRankListMapper.update(clazzRankItem);
};

pub.createClazzRankItem = (clazzRankItem) => {
  if (!_.isPlainObject(clazzRankItem) || !_.isNil(clazzRankItem.id)) {
    winston.error('创建班级排行榜记录失败，参数错误！！！clazzRanKItem: %j', clazzRankItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzRankListMapper.create(clazzRankItem);
};

module.exports = pub;
