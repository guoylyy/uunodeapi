'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const winston = require('winston');
const Promise = require('bluebird');
const moment = require('moment');

const clazzUtil = require('./util/clazz.util');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const clazzAccountMapper = require('../dao/mysql_mapper/clazzAccount.mapper');
const clazzMapper = require('../dao/mongodb_mapper/clazz.mapper');
const checkinMapper = require('../dao/mongodb_mapper/checkin.mapper');
const userMapper = require('../dao/mysql_mapper/user.mapper');
const clazzAccountRecordMapper = require('../dao/mysql_mapper/clazzAccountRecord.mapper');

const concreteQueryParam = (clazzId, joinStatusList, excludeUserIds) => {
  let quryParam = {clazzId: clazzId};
  let statusList = [];
  // 处理状态列表
  _.forEach(joinStatusList, (joinStatus) => {
    if (!_.isNil(enumModel.getEnumByKey(joinStatus, enumModel.clazzJoinStatusEnum))) {
      statusList.push(joinStatus);
    }
  });
  if (!_.isEmpty(statusList)) {
    quryParam.status = statusList;
  }

  if (_.isArray(excludeUserIds)) {
    quryParam.userId = {operator: 'not in', value: excludeUserIds}
  }
  return quryParam;
};

const pub = {};

/**
 * 根据clazzId和userId获取ClazzAccount对象
 *
 * @param clazzId
 * @param userId
 * @returns {Promise}
 */
pub.queryClazzAccountByClazzId = (clazzId, userId) => {
  if (_.isNil(clazzId) && _.isNil(userId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 参数处理
  let queryParams = {};
  if (!_.isNil(clazzId)) {
    queryParams.clazzId = clazzId;
  }
  if (!_.isNil(userId)) {
    queryParams.userId = userId;
  }

  return clazzAccountMapper.queryClazzAccounts(queryParams);
};

/**
 * 计算班级加班人数
 *
 * @param clazzId
 */
pub.countClazzJoinedUser = (clazzId) => {
  return clazzAccountMapper.countClazzAccounts({
    clazzId: clazzId,
    status: [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.CLOSE.key]
  });
};

/**
 * 计算一组班级加入班级的人数
 */
pub.countClazzsJoinedUserByGroup = (clazzIds) => {
  return clazzAccountMapper.countClazzAccountsByGroup({
    clazzId: clazzIds,
    status: [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.CLOSE.key]
  });
};

/**
 * 根据status状态，分页获取userId用户加入的班级列表和加班记录
 * @param userItem
 * @param status
 * @param isCheckinable
 * @returns {Promise.<TResult>}
 */
pub.queryUserClazzByStatus = (userItem, status, isCheckinable) => {
  let globalClazzAccountList;
  // 1. 获取userId用户加入的所有处于status状态的clazzAccount
  return clazzAccountMapper.queryClazzAccounts({userId: userItem.id, status: status})
      .then((clazzAccountList) => {
        globalClazzAccountList = clazzAccountList;
        debug(globalClazzAccountList);

        // 2. 获取clazz id列表
        const clazzIds = _.map(globalClazzAccountList, 'clazzId');

        debug(clazzIds);

        // 3. 获取用户班级数据
        const queryClazzListPromise = clazzMapper.query({_id: clazzIds});

        let queryCheckinListPromise;
        if (isCheckinable === true) {
          const nowMoment = moment();

          const todayStartDate = nowMoment.startOf('day').toDate(),
              todayEndDate = nowMoment.endOf('day').toDate();

          queryCheckinListPromise = checkinMapper.queryCheckinList({
            clazz: clazzIds,
            userId: userItem.id,
            checkinTime: {$gte: todayStartDate, $lte: todayEndDate}
          });
        } else {
          queryCheckinListPromise = Promise.resolve([]);
        }

        return Promise.all([queryClazzListPromise, queryCheckinListPromise]);
      })
      .then((results) => {
        const clazzList = results[0],
            checkinList = results[1];

        debug(checkinList);

        // 过滤用户可打卡课程列表
        if (isCheckinable === true) {
          const clazzAccountMap = _.keyBy(globalClazzAccountList, 'clazzId'),
              checkinClazzMap = _.keyBy(checkinList, 'clazz');

          const filteredClazzList = _.chain(clazzList)
              .filter((clazzItem) => clazzUtil.checkCanClazzCheckin(clazzItem, clazzAccountMap[clazzItem.id], userItem))
              .forEach((clazzItem) => {
                clazzItem.hasCheckin = _.has(checkinClazzMap, clazzItem.id);
              })
              .value();

          debug(filteredClazzList);

          return [filteredClazzList, globalClazzAccountList];
        }

        return [clazzList, globalClazzAccountList];
      });
};

/**
 * 计算学员班级的课程学分
 * 返回 {
    name:           班级名称
    startDate:      开班日期
    endDate:        结班日期
    tasks:          任务数,
    scores:         已获得需分
    finishedTasks:  完成任务数
 * }
 *
 * @param clazzItem
 * @param clazzAccountItem
 * @returns {Promise|Promise.<TResult>}
 */
pub.calculateClazzScore = (clazzItem, clazzAccountItem) => {
  const userId = clazzAccountItem.userId,
      clazzId = clazzItem.id,
      clazzBaseMoment = clazzUtil.calculateTaskBaseMoment(
          clazzItem.startDate,
          clazzAccountItem.joinDate,
          clazzItem.clazzType
      ),
      todayEndMoment = moment().endOf('day');

  return checkinMapper.queryCheckinList(
      {
        userId: userId,
        clazz: clazzId,
        checkinTime: {
          $gte: clazzBaseMoment.toDate(),
          $lte: todayEndMoment.toDate()
        }
      })
      .then((checkinList) => {
        debug(checkinList);
        const taskCount = clazzUtil.getClazzTaskCount(clazzItem);

        const clazzScore = {
          name: clazzItem.name,
          startDate: clazzItem.startDate,
          endDate: clazzItem.endDate,
          tasks: Math.max(
              0,
              Math.min(todayEndMoment.diff(clazzBaseMoment, 'days'), taskCount)
          ),
          scores: 0, // 学分
          finishedTasks: 0, // 完成任务数
          checkins: []
        };

        _.forEach(checkinList, (checkinItem) => {
          // 累加学分 和 完成任务数
          clazzScore.scores += checkinItem.score;
          ++clazzScore.finishedTasks;
          clazzScore.checkins.push(_.pick(checkinItem, ['id', 'checkinTime', 'status', 'score']))
        });

        debug(clazzScore);
        return clazzScore;
      });
};

/**
 * 根据用户，账单创建一条新的clazz_account记录
 * 用于用户加入班级
 *
 * @param user
 * @param clazz
 * @returns {Promise.<*>}
 */
pub.userJoinClazz = (user, clazz) => {
  if (!_.isPlainObject(user) || !_.isPlainObject(clazz)) {
    winston.error('创建clazzAccount记录失败，参数错误！！！');
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  let clazzAccountItem = {
    userId: user.id,
    clazzId: clazz.id,
    joinDate: new Date(),
  };
  // 根据课程加入方式设置status
  let clazzConfigType = _.get(clazz, 'configuration.clazzType', []);
  debug(clazzConfigType);
  if (_.includes(clazzConfigType, enumModel.clazzJoinStatusEnum.INVITATION.key)) {
    clazzAccountItem.status = enumModel.clazzJoinStatusEnum.INVITATION.key;
  } else {
    clazzAccountItem.status = enumModel.clazzJoinStatusEnum.PAYING.key;
  }

  debug(clazzAccountItem);
  return clazzAccountMapper.create(clazzAccountItem);
};

/**
 * 更新clazz_account记录
 *
 * @param clazzAccountItem
 * @returns {*}
 */
pub.update = (clazzAccountItem) => {
  if (!_.isPlainObject(clazzAccountItem) || _.isNil(clazzAccountItem.id)) {
    winston.error('更新clazzAccount记录失败，参数错误！！！ clazzAccountItem: %j', clazzAccountItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzAccountMapper.update(clazzAccountItem);
};

/**
 * 根据id获取clazz_account信息
 *
 * @param clazzAccountId
 * @returns {*}
 */
pub.fetchClazzAccountById = (clazzAccountId) => {
  if (_.isNil(clazzAccountId)) {
    winston.error('获取clazzAccount记录失败，参数错误！！！ clazzAccountId: %s', clazzAccountId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzAccountMapper.fetchByParam({id: clazzAccountId});
};

/**
 * 获取在clazzId状态为joinStatus的学号或姓名LIKE keyWord的学员列表
 *
 * @param clazzId
 * @param joinStatusList
 * @param keyword
 * @param pageNumber
 * @param pageSize
 * @param excludeUserIds  排除的用户id列表
 * @returns {*}
 */
pub.searchPagedClazzAccounts = (clazzId, joinStatusList, keyword, pageNumber, pageSize, excludeUserIds) => {
  if (_.isNil(clazzId)) {
    winston.error('查询班级用户分页列表失败，参数错误！！！ clazzId: %s, joinStatusList: %s, keyword: %s', clazzId, joinStatusList, keyword);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  winston.info('查询班级用户分页列表！！！ clazzId: %s, joinStatusList: %s, keyword: %s', clazzId, joinStatusList, keyword);

  pageNumber = pageNumber || 1;
  pageSize = pageSize || 10;

  let quryParam = concreteQueryParam(clazzId, joinStatusList, excludeUserIds);

  let clazzAccountMap = {};
  return clazzAccountMapper.queryClazzAccounts(quryParam)
      .then((clazzAccountList) => {
        debug(clazzAccountList);

        let userIds = [];
        _.forEach(clazzAccountList, (clazzAccountItem) => {
          let userId = clazzAccountItem.userId;
          clazzAccountMap[userId] = clazzAccountItem;
          userIds.push(userId);
        });

        return userIds;
      })
      .then((userIds) => {
        debug(userIds);
        return userMapper.queryPageUsers({id: userIds, keyword: keyword}, pageNumber, pageSize);
      })
      .then((pagedResult) => {
        pagedResult.values = _.map(pagedResult.values, (userItem) => {
          let clazzAccount = clazzAccountMap[userItem.id];

          clazzAccount.user = userItem;

          return clazzAccount;
        });

        debug(pagedResult);
        return pagedResult;
      })
};

/**
 * 搜索班级中除excludeUserIds外处于joinStatusList状态列表学号或姓名LIKE keyWord的学员列表
 *
 * @param clazzId
 * @param joinStatusList
 * @param keyword
 * @param excludeUserIds
 * @returns {*}
 */
pub.searchClazzUsers = (clazzId, joinStatusList, keyword, excludeUserIds) => {
  if (_.isNil(clazzId)) {
    winston.error('查询班级用户列表失败，参数错误！！！ clazzId: %s, joinStatusList: %s, keyword: %s, excludeUserIds: %j', clazzId, joinStatusList, keyword, excludeUserIds);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = concreteQueryParam(clazzId, joinStatusList, excludeUserIds);

  const globalUserIdAccountMap = {};
  return clazzAccountMapper.queryClazzAccounts(queryParam)
      .then((clazzAccountList) => {
        debug(clazzAccountList);

        const userIds = [];
        _.forEach(clazzAccountList, (clazzAccount) => {
          userIds.push(clazzAccount.userId);
          globalUserIdAccountMap[clazzAccount.userId] = clazzAccount;
        });
        // return userService.queryUser(keyword, userIds);
        if (_.isString(keyword) && keyword !== '') {
          return userMapper.queryAll({'keyword': keyword, id: userIds});
        } else {
          return userMapper.queryAll({id: userIds});
        }
      })
      .then((userList) => {
        _.forEach(userList, (userItem) => {
          userItem.clazzAccount = globalUserIdAccountMap[userItem.id];
        });

        return userList;
      })
};

/**
 * 长期班查询班级账户记录列表
 *
 * @param clazzAccountItem
 * @returns {*}
 */
pub.queryClazzAccountRecords = (clazzAccountItem) => {
  if (!_.isPlainObject(clazzAccountItem) || _.isNil(clazzAccountItem.id)) {
    winston.error('查询班级账户记录列表失败，参数错误！！！clazzAccountItem: %j', clazzAccountItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzAccountRecordMapper.queryClazzAccountRecordList({clazzAccountId: clazzAccountItem.id});
};

/**
 * 新建长期班班级账户记录信息
 *
 * @param clazzAccountItem
 * @param newClazzAccountRecord
 * @returns {*}
 */
pub.createClazzAccountRecord = (clazzAccountItem, newClazzAccountRecord) => {
  if (!_.isPlainObject(clazzAccountItem) || _.isNil(clazzAccountItem.id)
      || !_.isPlainObject(newClazzAccountRecord) || !_.isNil(newClazzAccountRecord.id)) {
    winston.error('创建班级账户记录列表失败，参数错误！！！clazzAccountItem: %j，newClazzAccountRecord: %j', clazzAccountItem, newClazzAccountRecord);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 保证newClazzAccountRecord中信息与clazzAccountItem一致
  newClazzAccountRecord.clazzAccountId = clazzAccountItem.id;
  newClazzAccountRecord.userId = clazzAccountItem.userId;
  newClazzAccountRecord.clazzId = clazzAccountItem.clazzId;

  return clazzAccountRecordMapper.create(newClazzAccountRecord);
};

/**
 * 更新长期班账户记录信息
 *
 * @param clazzAccountRecord
 * @returns {*}
 */
pub.updateClazzAccountRecord = (clazzAccountRecord) => {
  if (!_.isPlainObject(clazzAccountRecord) || _.isNil(clazzAccountRecord.id)) {
    winston.error('更新班级账户记录失败，参数错误！！！clazzAccountRecord: %j', clazzAccountRecord);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzAccountRecordMapper.update(clazzAccountRecord);
};

/**
 * 创建新的班级账户信息
 *
 * @param clazzAccountItem
 * @returns {*}
 */
pub.createClazzAccount = (clazzAccountItem) => {
  if (!_.isPlainObject(clazzAccountItem) || !_.isNil(clazzAccountItem.id)) {
    winston.error('创建班级账户败，参数错误！！！clazzAccountItem: %j', clazzAccountItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzAccountMapper.create(clazzAccountItem);
};

/**
 * 根据id列表查询班级账户信息
 *
 * @param clazzAccountIdList
 * @returns {*}
 */
pub.queryClazzAccountListByIds = (clazzAccountIdList) => {
  if (!_.isArray(clazzAccountIdList)) {
    winston.error('查询班级账户列表失败，参数错误！！！clazzAccountIdList: %s', clazzAccountIdList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  if (_.isEmpty(clazzAccountIdList)) {
    return Promise.resolve([]);
  }

  return clazzAccountMapper.queryClazzAccounts({
    id: clazzAccountIdList
  });
};

/**
 * 彻底删除长期班账户记录信息
 *
 * @param clazzAccountRecordId
 * @returns {Promise|Promise.<*>}
 */
pub.deleteClazzAccountRecordItemById = (clazzAccountRecordId) => {
  if (_.isNil(clazzAccountRecordId)) {
    winston.error('删除班级账户记录失败，参数错误！！！clazzAccountRecordId: %s', clazzAccountRecordId);
    return Promise.reject(new Error('参数错误'));
  }

  return clazzAccountRecordMapper.delete(clazzAccountRecordId);
};

/**
 * 计算用户加入的课程数量
 * 去除 PROMOTION 类型课程
 *
 * @param userId
 * @returns {*}
 */
pub.countUserJoinedPromotionClazzes = (userId) => {
  if (_.isNil(userId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzAccountMapper.queryClazzAccounts({userId: userId})
      .then((clazzAccountList) => {
        debug(clazzAccountList);

        const notJoinedStatusList = [
          enumModel.clazzJoinStatusEnum.PAYING.key,
          enumModel.clazzJoinStatusEnum.PENDING.key,
          enumModel.clazzJoinStatusEnum.INVITATION.key
        ];

        const clazzIdList = _.chain(clazzAccountList)
            .reject((clazzAccountItem) => _.includes(notJoinedStatusList, clazzAccountItem.status)) // 过滤掉未成功加入的班级
            .map('clazzId')
            .value();

        debug(clazzIdList);

        return clazzMapper.query({_id: clazzIdList});
      })
      .then((clazzList) => {
        debug(clazzList);

        const nonPromotionClazzList = _.filter((clazzList), (clazzItem) => {
          // 去除 PROMOTION 类型课程
          if (clazzItem.clazzType === enumModel.clazzTypeEnum.PROMOTION.key) {
            return false;
          }

          // 保留推广中的课程
          return _.get(clazzItem, ['configuration', 'promotionOffer', 'isPromotion'], true);
        });

        return _.size(nonPromotionClazzList);
      });
};

/**
 * 用户退出长期班
 * 更新record中的endDate
 *
 * @param clazzAccount
 * @returns {Promise.<*>}
 */
pub.cancelLongTermClazzAccount = (clazzAccount) => {
  const nowMoment = moment(),
      todayEndDate = moment().endOf('day').toDate();

  const updateClazzAccountPromise = pub.update(
      _.extend(
          {},
          clazzAccount,
          {
            endDate: todayEndDate,
            status: enumModel.clazzJoinStatusEnum.CANCELED.key
          })
      ),
      updateClazzAccountRecordsPromise = pub.queryClazzAccountRecords(clazzAccount)
          .then((clazzAccountRecordList) => {
            return _.chain(clazzAccountRecordList)
                .filter((record) => nowMoment.isBefore(record.endDate, 'day'))  // 过滤结束日期在今天之后的记录
                .map((record) => {
                  // 更新 record 的 endDate
                  return pub.updateClazzAccountRecord({
                    id: record.id,
                    endDate: todayEndDate
                  })
                })
                .value();
          });

  return Promise.all([updateClazzAccountPromise, updateClazzAccountRecordsPromise]);
};

/**
 * 更新班级账户及相关record信息
 *
 * @param clazzAccount
 * @param currentClazz
 * @returns {Promise.<*>}
 */
pub.updateClazzAccountAndRelatedRecords = (clazzAccount, currentClazz) => {
  /*
   如果操作为 退出长期班，则需要更新长期班截止日期
   其他情况则只无需更新
   */
  if (currentClazz.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key && clazzAccount.status === enumModel.clazzJoinStatusEnum.CANCELED.key) {
    return pub.cancelLongTermClazzAccount(clazzAccount);
  } else {
    const userId = clazzAccount.userId;

    const updateClazzAccountPromise = pub.update(clazzAccount),
        updateClazzAccountRecordsPromise = _.isNil(userId)
            ? Promise.resolve([])
            : clazzAccountRecordMapper.queryClazzAccountRecordList({
              clazzId: currentClazz.id
            })
                .the((clazzRecordList) => {
                  const updateClazzRecordPromiseList = _.map(clazzRecordList, (clazzRecordItem) => {
                    return clazzAccountRecordMapper.update({
                      id: clazzRecordItem.id,
                      userId: userId
                    });
                  });

                  return Promise.all(updateClazzRecordPromiseList);
                });

    return Promise.all([updateClazzAccountPromise, updateClazzAccountRecordsPromise]);
  }
};

module.exports = pub;
