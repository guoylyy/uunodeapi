'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');
const moment = require('moment');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const userService = require('./user.service');

const wechatAuth = require('../lib/wechat.auth');
const wechatTemplateMessage = require('../lib/wechat.template.message');
const wechatTemplateReply = require('../lib/wechat.template.reply');

const activityAccountMapper = require('../dao/mongodb_mapper/clazzActivityAccount.mapper');
const activityRoomMapper = require('../dao/mongodb_mapper/clazzActivityRoom.mapper');
const activityRoomRecordMapper = require('../dao/mongodb_mapper/clazzActivityRoomRecord.mapper');

const pub = {};

/**
 * 新建活动账户信息
 *
 * @param clazzItem
 * @param userItem
 * @param accountInfo
 * @returns {*}
 */
pub.createActivityAccountItem = (clazzItem, userItem, accountInfo) => {
  if (!_.isPlainObject(clazzItem) || !_.isPlainObject(userItem) || !_.isPlainObject(accountInfo)) {
    winston.error('新建活动账户信息失败, 参数错误！！！clazzItem: %j, userItem: %j, accountInfo: %j', clazzItem, userItem, accountInfo);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  const activityAccountItem = {
    clazz: clazzItem.id,
    userId: userItem.id,
    status: enumModel.activityAccountStatusEnum.PENDING.key,
    gender: accountInfo.gender,
    introduction: accountInfo.introduction,
    partnerRequired: {
      gender: accountInfo.partnerInfo.gender
    },
    version: clazzItem.version
  };

  return activityAccountMapper.create(activityAccountItem)
};

/**
 * 获取活动账户信息
 *
 * @param clazzItem
 * @param userItem
 * @returns {Promise|Promise.<*>}
 */
pub.fetchActivityAccountItem = (clazzItem, userItem) => {
  if (!_.isPlainObject(clazzItem) || !_.isPlainObject(userItem)) {
    winston.error('获取活动账户信息失败, 参数错误！！！clazzItem: %j, userItem: %j', clazzItem, userItem);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  const queryParam = {
    clazz: clazzItem.id,
    userId: userItem.id
  };

  const clazzVersion = _.get(clazzItem, 'version', null);

  if (clazzVersion) {
    queryParam.version = clazzItem.version;
  }

  return activityAccountMapper.fetchByParams(queryParam);
};

/**
 * 根据房间id获取活动房间信息
 *
 * @param roomId
 * @param currentUserId
 * @returns {*}
 */
pub.fetchActivityRoomById = (roomId, currentUserId) => {
  if (!_.isString(roomId)) {
    winston.error('获取活动房间信息失败, 参数错误！！！roomId: %j', roomId);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  return activityRoomMapper.fetchById(roomId)
      .then((activityRoomItem) => {
        debug(activityRoomItem);

        const fetchUserPromiseList = _.map(activityRoomItem.partnerList, (userId) => userService.fetchById(userId));
        const fetchActivityAccountPromiseList = _.map(activityRoomItem.activityAccountList, (activityAccountId) => {
          return activityAccountMapper.fetchById(activityAccountId);
        });

        return Promise.all([Promise.all(fetchUserPromiseList), Promise.all(fetchActivityAccountPromiseList)])
            .then((results) => {
              const userItemList = results[0],
                  activityAccountList = results[1];

              debug(userItemList);
              debug(activityAccountList);

              const activityAccountMap = _.keyBy(activityAccountList, 'userId');

              activityRoomItem.userInfo = _.chain(userItemList)
                  .find({ id: currentUserId })
                  .extend({ introduction: activityAccountMap[currentUserId].introduction })
                  .value();

              activityRoomItem.partnerInfo = _.find(userItemList, (userItem) => userItem.id !== currentUserId);
              activityRoomItem.partnerInfo.introduction = activityAccountMap[activityRoomItem.partnerInfo.id].introduction;

              return activityRoomItem;
            });
      });
};

/**
 * 根据id更新活动房间状态
 *
 * @param roomId
 * @param status
 * @param endDate   结束日期，非必需
 * @returns {*}
 */
pub.updateActivityRoomStatusById = (roomId, status, endDate) => {
  if (_.isNil(roomId) || _.isNil(enumModel.getEnumByKey(status, enumModel.activityRoomStatusEnum))) {
    winston.error('更新活动房间信息状态失败, 参数错误！！！roomId: %s, status: %s', roomId, status);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  const roomItem = { status: status };
  if (_.isDate(endDate)) {
    roomItem.endDate = endDate;
  }

  return activityRoomMapper.updateById(roomId, roomItem);
};

/**
 * 查询活动统计信息
 *
 * @param clazzItem
 * @returns {*}
 */
pub.queryActivityStatistics = (clazzItem) => {
  if (!_.isPlainObject(clazzItem)) {
    winston.error('查询活动统计结果, 参数错误！！！clazzItem: %j', clazzItem);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  return activityAccountMapper.queryActivityAccountList(
      {
        clazz: clazzItem.id,
        version: clazzItem.version
      })
      .then((activityAccountList) => {
        // 性别枚举Key
        const maleGenderEnumKey = enumModel.genderEnum['1'].key,
            femaleGenderEnumKey = enumModel.genderEnum['2'].key;

        /*
         形如下方的用户列表Map
         {
         maleGenderEnumKey: [males],
         femaleGenderEnumKey: [females]
         }
         */
        const genderListMap = _.groupBy(activityAccountList, 'gender');

        const totalSize = _.size(activityAccountList),
            maleSize = _.size(genderListMap[maleGenderEnumKey]),
            femaleSize = _.size(genderListMap[femaleGenderEnumKey]);

        return {
          total: totalSize,
          male: maleSize,
          female: femaleSize
        }
      });
};

/**
 * 查询所有未匹配的用户列表
 *
 * @param clazzItem
 * @returns {*}
 */
pub.queryUnmatchedActivityAccountList = (clazzItem) => {
  if (!_.isPlainObject(clazzItem)) {
    winston.error('查询活动账户列表失败, 参数错误！！！clazzItem: %j', clazzItem);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  return activityAccountMapper.queryActivityAccountList(
      {
        clazz: clazzItem.id,
        version: clazzItem.version,
        clazzActivityRoom: null
      });
};

/**
 * 新建活动房间，并通知各方
 * todo 分离新建 和 通知操作
 *
 * @param activityInfo
 * @param activityAccountList
 * @param generateNotifyMessageContent
 * @returns {*}
 */
pub.createActivityRoomItem = (activityInfo, activityAccountList, generateNotifyMessageContent) => {
  if (!_.isPlainObject(activityInfo) || !_.isArray(activityAccountList) || _.size(activityAccountList) < 2) {
    winston.error('新建活动房间失败, 参数错误！！！activityInfo: %j, activityAccountList: %j', activityInfo, activityAccountList);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  const clazzId = activityInfo.id,
      userIdList = _.map(activityAccountList, 'userId');

  debug(userIdList);

  // 生成房间
  return activityRoomMapper.create(
      {
        clazz: clazzId,
        status: enumModel.activityRoomStatusEnum.CLOSED.key,
        version: activityInfo.version,
        activityAccountList: _.map(activityAccountList, 'id'),
        partnerList: userIdList,
        recordList: []
      })
      .then((activityRoomItem) => {
        // 更新用户账户
        const updateActivityAccountPromiseList = _.map(activityAccountList, (activityAccountItem) => {
          return activityAccountMapper.updateById(
              activityAccountItem.id,
              {
                status: enumModel.activityAccountStatusEnum.PROCESSING.key,
                clazzActivityRoom: activityRoomItem.id
              }
          );
        });

        return Promise.all(updateActivityAccountPromiseList)
            .then((updatedActivityAccountList) => {
              debug(updatedActivityAccountList);

              const fetchUserPromiseList = _.map(userIdList, (userId) => userService.fetchById(userId));

              return Promise.all(fetchUserPromiseList);
            })
            .then((userItemList) => {
              // 通知各方
              return wechatAuth.requestLocalWechatAccessToken()
                  .then((wechatToken) => {
                    debug(wechatToken);

                    const notifyUserPromiseList = _.map(userItemList, (userItem) => {
                      const partnerActivityInfo = _.find(activityAccountList, (activityAccount) => activityAccount.userId !== userItem.id);

                      const partnerGender = enumModel.getEnumByKey(partnerActivityInfo.gender, enumModel.genderEnum);
                      const partnerGenderName = partnerGender ? partnerGender.name : '未知';
                      const partnerIntroduction = _.get(partnerActivityInfo, 'introduction', '对方什么都没有写');

                      const messageContent = generateNotifyMessageContent(partnerGenderName, partnerIntroduction);

                      const activityAlertMsg = wechatTemplateMessage.ACTIVITY_ALERT(
                          userItem.openId,
                          messageContent.title,
                          '#U树洞#',
                          'Uband友班',
                          messageContent.description,
                          messageContent.url
                      );

                      debug(activityAlertMsg);

                      return wechatTemplateReply.postTemplateWithToken(activityAlertMsg, wechatToken, true, clazzId, userItem.id);
                    });

                    return Promise.all(notifyUserPromiseList)
                  });
            })
            .then((notifyResultList) => {
              debug(notifyResultList);

              return activityRoomItem;
            });
      });
};

/**
 * 记录房间聊天信息
 *
 * @param recordItem
 * @returns {*}
 */
pub.createActivityRoomRecord = (recordItem) => {
  if (!_.isPlainObject(recordItem) || !_.isNil(recordItem.id)) {
    winston.error('记录房间聊天信息失败，参数错误！！！recordItem: %j', recordItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return activityRoomRecordMapper.create(recordItem);
};

/**
 * 查询所有满足条件的活动房间列表
 *
 * @param status
 * @param endDate
 * @returns {*}
 */
pub.queryActivityRoomList = (status, endDate) => {
  if (_.isNil(status)) {
    winston.error('查询活动房间列表失败，参数错误！！！ status: %j, endDate: %j', status, endDate);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = { status: status };
  if (_.isDate(endDate)) {
    queryParam.endDate = { '$lte': endDate };
  }

  return activityRoomMapper.query(queryParam)
      .then((activityRoomList) => {
        debug(activityRoomList);

        /*
         1. 映射 userId -> activityRoom
         2. activityRoom.partnerInfoList 设置初始值 []
         */
        const userIdRoomMap = _.reduce(
            activityRoomList,
            (roomMap, roomItem) => {
              // 为 partnerInfoList 设置初始值 []
              roomItem.partnerInfoList = [];

              // 映射 userId -> activityRoom
              _.chain(roomItem)
                  .get('partnerList', [])
                  .forEach((userId) => {
                    roomMap[userId] = roomItem;
                  })
                  .value();

              return roomMap;
            },
            {}
        );

        debug(userIdRoomMap);

        // 获取所有房间的用户Id列表
        const userIds = _.reduce(
            activityRoomList,
            (userIds, roomItem) => _.concat(userIds, _.get(roomItem, 'partnerList', [])),
            []
        );

        const queryUserListPromise = _.isEmpty(userIds)
            ? Promise.resolve([])
            : userService.queryUser(null, userIds);

        return queryUserListPromise.then((userItemList) => {
          debug(userItemList);

          _.forEach((userItemList), (userItem) => {
            userIdRoomMap[userItem.id].partnerInfoList.push(userItem);
          });

          return activityRoomList;
        });
      });
};

/**
 * 获取优伴未回复消息的活动账户列表
 *
 * @param clazzId
 * @param version
 * @param rematchDemandedUserIdList
 * @returns {Promise.<TResult>}
 */
pub.filterRematchRequiredUserActivityLIst = (clazzId, version, rematchDemandedUserIdList) => {
  if (!_.isString(clazzId) || !_.isInteger(version) || !_.isArray(rematchDemandedUserIdList)) {
    winston.error(
        '获取优伴未回复消息的活动账户列表失败，参数错误！！！clazzId： %s, version: %s, rematchDemandedUserIdList: %j',
        clazzId,
        version,
        rematchDemandedUserIdList
    );

    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 获取房间列表
  return activityRoomMapper.query({
        clazz: clazzId,
        version: version,
        status: { '$ne': enumModel.activityRoomStatusEnum.DISMISSED.key }
      })
      .then((roomList) => {
        debug(roomList);

        // 房间id列表
        const roomIdList = _.map(roomList, 'id'),
            // userId -> partnerId map
            userIdPartnerIdMap = _.reduce(
                roomList,
                (userIdPartnerIdMap, roomItem) => {
                  const partnerList = _.get(roomItem, 'partnerList', []);

                  const userId = _.first(partnerList),
                      partnerId = _.last(partnerList);

                  if (!_.isNil(userId) && !_.isNil(partnerList)) {
                    userIdPartnerIdMap[userId] = partnerId;
                    userIdPartnerIdMap[partnerId] = userId;
                  }

                  return userIdPartnerIdMap;
                },
                {}
            );

        // userId -> record_count map
        return activityRoomRecordMapper.countUserActivityInRoomList(roomIdList)
            .then((userIdRecordCountMap) => {
              debug(userIdRecordCountMap);

              // 优伴未回复消息的用户列表
              const userIdList = _.reduce(
                  userIdPartnerIdMap,
                  (userIdList, partnerId, userId) => {
                    // 用户消息数
                    const userCount = _.get(userIdRecordCountMap, userId, 0),
                        // 优伴消息数
                        partnerCount = _.get(userIdRecordCountMap, partnerId, 0);

                    // 用户消息数超过0， 优伴消息数为0
                    if (userCount > 0 && partnerCount === 0) {
                      userIdList.push(userId);
                    }

                    return userIdList;
                  },
                  rematchDemandedUserIdList
              );

              // 查询活动账户列表
              return activityAccountMapper.queryActivityAccountList({
                'clazz': clazzId,
                'version': version,
                'userId': userIdList
              });
            });
      })
};

/**
 * 解散房间
 *
 * @param roomIdList
 * @returns {Promise.<TResult>}
 */
pub.dismissRoomList = (roomIdList) => {

  return activityRoomMapper.query({
        '_id': roomIdList
      })
      .then((roomList) => {
        debug(roomList);
        const activityAccountIdList = _.reduce(
            roomList,
            (accountList, roomItem) => _.flatten([accountList, _.get(roomItem, 'activityAccountList', [])]),
            []
        );

        debug(activityAccountIdList);

        const pendingActivityAccountPromiseList = _.map(
            activityAccountIdList,
            (activityAccountId) => activityAccountMapper.updateById(
                activityAccountId,
                {
                  status: enumModel.activityAccountStatusEnum.PENDING.key,
                  clazzActivityRoom: null
                }
            )
        );

        return Promise.all(pendingActivityAccountPromiseList)
            .then((pendedActivityAccountList) => {
              debug(pendedActivityAccountList);

              const closeRoomPromiseList = _.map(
                  roomList,
                  (roomItem) => activityRoomMapper.updateById(
                      roomItem.id, {
                        status: enumModel.activityRoomStatusEnum.DISMISSED.key
                      }
                  )
              );

              return Promise.all(closeRoomPromiseList);
            })
      })
};

/**
 * 查询房间消息统计情况
 *
 * @param roomId
 * @returns {Promise.<TResult>}
 */
pub.queryRoomRecordStatistics = (roomId) => {

  function countByType(recordList, typeFunc) {
    return _.reduce(
        recordList,
        (typeCountMap, recordItem) => {
          const messageType = typeFunc(recordItem);

          if (!_.isNil(messageType)) {
            typeCountMap[messageType] = (typeCountMap[messageType] || 0) + 1;
          }

          return typeCountMap;
        },
        {}
    );
  }

  return activityRoomRecordMapper.query({
        clazzActivityRoom: roomId
      })
      .then((recordList) => {
        const sum = _.size(recordList);

        const typeCountMap = countByType(recordList, (recordItem) => _.get(recordItem, 'messageType'));
        const dateCountMap = countByType(recordList, (recordItem) => moment(recordItem.createdAt).format('YYYY-MM-DD'));

        return {
          sum: sum,
          type: typeCountMap,
          date: dateCountMap
        }
      })
};

/**
 * 新建活动账户信息
 *
 * @param activityAccountItem
 * @returns {*}
 */
pub.createPureActivityAccountItem = (activityAccountItem) => {
  if (!_.isPlainObject(activityAccountItem) || _.isNil(activityAccountItem.userId) || _.isNil(activityAccountItem.clazz)) {
    winston.error('新建活动账户信息失败, 参数错误！！！activityAccountItem: %j', activityAccountItem);
    return Promise.reject((commonError.PARAMETER_ERROR()));
  }

  activityAccountItem.favourList = [];
  activityAccountItem.status = enumModel.activityAccountStatusEnum.PENDING.key;

  return activityAccountMapper.create(activityAccountItem)
};

/**
 * 更新活动账户
 *
 * @param activityAccountId
 * @param activityAccount
 * @returns {*}
 */
pub.updateActivityAccountById = (activityAccountId, activityAccount) => {
  if (!_.isPlainObject(activityAccount) || !_.isNil(activityAccount.id) || _.isNil(activityAccountId)) {
    winston.error('更新活动账户信息失败，参数错误！！！activityAccountId: %s, activityAccount: %j', activityAccountId, activityAccount);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return activityAccountMapper.updateById(activityAccountId, activityAccount);
};

module.exports = pub;
