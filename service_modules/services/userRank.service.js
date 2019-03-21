'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const userService = require('./user.service');

const userDataProfileMapper = require('../dao/mysql_mapper/userDataProfile.mapper');

const pub = {};

pub.queryUserRankItem = (type, userItem) => {
  debug(type);
  debug(userItem);

  if (_.isNil(enumModel.getEnumByKey(type, enumModel.userRankTypeEnum)) || !_.isPlainObject(userItem) || _.isNil(userItem.id)) {
    winston.error('获取用户排行榜记录失败，参数错误！！！type: %s, userItem: %j', type, userItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userDataProfileMapper.fetchByParam({
        userId: userItem.id,
        type: type,
        rank: { operator: '>', value: 0 }
      })
      .then((userRankItem) => {
        debug(userRankItem);

        userRankItem.userInfo = userItem;

        return userRankItem;
      });
};

pub.queryUserRankList = (type) => {
  debug(type);

  if (_.isNil(enumModel.getEnumByKey(type, enumModel.userRankTypeEnum))) {
    winston.error('获取用户排行榜记录失败，参数错误！！！type: %s', type);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userDataProfileMapper.queryAll({
        type: type,
        rank: {
          operator: 'and',
          value: [{ operator: '>', value: 0 }, { operator: '<=', value: 100 }]
        }
      })
      .then((rankList) => {
        debug(rankList);

        if (_.isEmpty(rankList)) {
          return Promise.resolve([]);
        }

        const userIds = _.map(rankList, 'userId');

        return userService.queryUser(null, userIds)
            .then((userList) => {
              const userMap = _.keyBy(userList, 'id');

              return _.map((rankList), (userRank) => {
                userRank.userInfo = userMap[userRank.userId];

                return userRank;
              });
            });
      });
};

module.exports = pub;
