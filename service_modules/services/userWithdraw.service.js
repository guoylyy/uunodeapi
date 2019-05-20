'use strict';

const _ = require('lodash');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');
const moment = require('moment');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const userService = require('./user.service');
const checkinService = require('./checkin.service');
const clazzAccountService = require('./clazzAccount.service');

const userCoinMapper = require('../dao/mysql_mapper/userCoin.mapper');
const userWithdrawMapper = require('../dao/mysql_mapper/userWithdraw.mapper');
const userWithdrawLogMapper = require('../dao/mysql_mapper/userWithdrawLog.mapper');
const clazzWithdrawMapper = require('../dao/mongodb_mapper/clazzWithdraw.mapper');

/**
 * 查询用户列表
 *
 * @param userWithdrawList
 * @returns {*}
 */
const queryWithdrawUserList = (userWithdrawList) => {
  const userIds = _.map(userWithdrawList, 'userId');

  return userService.queryUser(null, userIds);
};

/**
 * 将用户匹配到退框详情中
 *
 * @param userList
 * @param withdrawList
 */
const matchUserToWithdrawItem = (userList, withdrawList) => {
  const userMap = _.keyBy(userList, 'id');

  _.forEach(withdrawList, (withdrawItem) => {
    withdrawItem.userInfo = userMap[withdrawItem.userId];
  });
};

const pub = {};

/**
 * 查询用户优币记录
 *
 * @param userId
 * @returns {Promise.<*>|Promise}
 */
pub.queryUserWithdraws = (userId) => {
  if (_.isNil(userId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userWithdrawMapper.query({ userId: userId });
};

/**
 * 查询用户优币记录
 *
 * @param withdrawIds
 * @returns {Promise.<*>|Promise}
 */
pub.queryUserWithdrawListByIds = (withdrawIds) => {
  if (!_.isArray(withdrawIds)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 查询并匹配用户到退款中
  return userWithdrawMapper.query({ id: withdrawIds })
      .then((withdrawList) => {
        return queryWithdrawUserList(withdrawList)
            .then((userList) => {
              matchUserToWithdrawItem(userList, withdrawList);

              return withdrawList;
            });
      });
};

/**
 * 新建用户提款记录
 *
 * @param userId
 * @param coins
 * @param payway
 * @param username
 * @param remark
 * @returns {*}
 */
pub.userWithdrawCoins = (userId, coins, payway, username, remark) => {
  if (_.isNil(userId) || !_.isSafeInteger(coins) || coins <= 0 || _.isNil(enumModel.getEnumByKey(payway, enumModel.payWayEnum))) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userCoinMapper.sumUserCoin(userId)
      .then((results) => {
        let coinSum = results || 0;

        // 如果所申请金额大于用户现有优币总额
        if (coins > coinSum) {
          return Promise.reject(commonError.PARAMETER_ERROR('余额不足'));
        }

        let withdrawItem = {
              userId: userId,
              payway: payway,
              score: coins,
              applyMoney: coins,
              status: enumModel.withdrawStatusEnum.WAITING.key,
              keyWord: username,
              remark: remark,
              applyDate: new Date()
            },
            coinItem = {
              coinChange: -coins,
              userId: userId,
              title: '提现操作',
              bizType: enumModel.coinBizTypeEnum.WITHDRAW.key,
              changeDate: new Date(),
            };

        let globalWithdrawItem, globalCoinItem;
        return userWithdrawMapper.create(withdrawItem)
            .then((withdrawItem) => {
              debug(withdrawItem);
              globalWithdrawItem = withdrawItem;

              // 设置 优币的bizId字段
              coinItem.bizId = withdrawItem.id;

              return userCoinMapper.create(coinItem);
            })
            .then((coinItem) => {
              debug(coinItem);
              globalCoinItem = coinItem;

              return globalWithdrawItem;
            })
            .catch((error) => {
              debug(error);
              // 如果catch到错误，则将新建的item都destroy掉
              let promiseList = [];
              if (globalWithdrawItem) {
                promiseList.push(userWithdrawMapper.destroy(globalWithdrawItem.id));
              }
              if (globalCoinItem) {
                promiseList.push(userCoinMapper.destroy(globalCoinItem.id));
              }

              return Promise.all(promiseList)
                  .then((results) => {
                    debug(results);

                    // 返回新的错误
                    return Promise.reject(commonError.BIZ_FAIL_ERROR(error.message));
                  })
            });
      });
};

/**
 * [admin] 分页获取退款列表
 *
 * @param pageNumber
 * @param pageSize
 * @param withdrawStatus
 * @param applyDate
 * @param searchType
 * @param keyword
 */
pub.fetchPagedWithdraws = (pageNumber, pageSize, withdrawStatus, applyDate, searchType, keyword) => {
  debug(pageNumber);
  debug(pageSize);
  debug(withdrawStatus);
  debug(applyDate);
  debug(searchType);
  debug(keyword);

  const isSearchTypeNil = _.isNil(searchType),
      isKeywordNil = _.isNil(keyword);

  debug(isKeywordNil);
  debug(isKeywordNil);

  if (!_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 当isSearchTypeNil及isKeywordNil中一方为Nil而另一方不为Nil
  if ((isSearchTypeNil && !isKeywordNil) || (!isSearchTypeNil && isKeywordNil)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 退款查询参数
  const withdrawQueryParam = {};

  // 当 withdrawStatus 不为空
  if (!_.isNil(withdrawStatus)) {
    // 非enumModel.couponStatusEnum中的成员时 参数错误
    if (_.isNil(enumModel.getEnumByKey(withdrawStatus, enumModel.withdrawStatusEnum))) {
      return Promise.reject(commonError.PARAMETER_ERROR());
    }

    // 设置 status
    withdrawQueryParam.status = withdrawStatus;
  }

  // 当 applyDate 不为空
  if (!_.isNil(applyDate)) {
    if (!_.isDate(applyDate)) {
      return Promise.reject(commonError.PARAMETER_ERROR());
    }

    // 设置 applyDate
    const applyStartDate = moment(applyDate).startOf('day').toDate(),
        applyEndDate = moment(applyDate).endOf('day').toDate();

    withdrawQueryParam.applyDate = {
      operator: 'between',
      value: [applyStartDate, applyEndDate]
    };
  }

  pageNumber = pageNumber || 1;
  pageSize = pageSize || 10;

  let fetchWithdrawAndUserPromise;

  // 根据查询类型是否为空来决定如何获取退款列表及用户信息
  if (isSearchTypeNil) {
    /*
     1. 先获取退款列表
     2. 获取退款对应的用户列表
     */
    fetchWithdrawAndUserPromise = userWithdrawMapper.queryPagedWithdraws(withdrawQueryParam, pageNumber, pageSize)
        .then((pagedWithdraws) => {
          return queryWithdrawUserList(pagedWithdraws.values)
              .then((userList) => [pagedWithdraws, userList]);
        });
  } else {
    /*
     1. 先根据查询条件获取用户列表
     2. 根据用户列表获取退款列表
     */
    fetchWithdrawAndUserPromise = userService.queryUserBySearchType(searchType, keyword)
        .then((userList) => {
          withdrawQueryParam.userId = _.map(userList, 'id');

          return userWithdrawMapper.queryPagedWithdraws(withdrawQueryParam, pageNumber, pageSize)
              .then((pagedWithdraws) => [pagedWithdraws, userList]);
        })
  }

  return fetchWithdrawAndUserPromise.then(
      (results) => {
        debug(results);

        const pagedWithdraws = results[0],
            userList = results[1];

        matchUserToWithdrawItem(userList, pagedWithdraws.values);

        return pagedWithdraws;
      }
  )
};


/**
 * 根据id获取用户退款详情
 *
 * @param withdrawId
 * @returns {*}
 */
pub.fetchUserWithdrawInfoById = (withdrawId) => {
  if (_.isNil(withdrawId)) {
    winston.error('根据id获取退款详情，参数错误！！！withdrawId: %s', withdrawId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userWithdrawMapper.fetchByParam({ id: withdrawId });
};

/**
 * 保存用户提现记录log
 *
 * @param logType
 * @param logContent
 */
pub.logUserWithdraw = (logType, logContent) => {
  if (_.isNil(enumModel.getEnumByKey(logType, enumModel.withdrawLogTypeEnum)) || !_.isPlainObject(logContent)) {
    winston.error('保存用户提现记录Log失败，参数错误！！！logType: %s, logContent: %j', logType, logContent);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userWithdrawLogMapper.create({
    logType: logType,
    logContent: JSON.stringify(logContent)
  })
};

/**
 * 更新用户退款信息
 *
 * @param withdrawItem
 * @returns {*}
 */
pub.updateWithdrawItem = (withdrawItem) => {
  if (!_.isPlainObject(withdrawItem) || _.isNil(withdrawItem.id)) {
    winston.error('更新退款状态失败，参数错误！！！withdrawItem: %j', withdrawItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userWithdrawMapper.update(withdrawItem);
};

/**
 * 分页查询班级退款历史
 *
 * @param clazzId
 * @param pageNumber
 * @param pageSize
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.queryPagedClazzWithdrawList = (clazzId, pageNumber, pageSize) => {
  if (_.isNil(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('分页查询班级退款列表失败，参数错误！！！clazzId: %s, pageNumber: %d, pageSize: %d', clazzId, pageNumber, pageSize);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzWithdrawMapper.pagedQuery(
      {
        clazz: clazzId
      },
      pageNumber,
      pageSize
  );
};

/**
 * 查询班级周退款详情信息
 *
 * @param currentClazzId
 * @param queryStartDate
 * @param queryEndDate
 * @param maxCheckinTimes
 * @param checkinPrice
 *
 * 返回 [退款详情列表， 用户列表, 打卡列表]
 */
pub.queryClazzWeeklyWithdrawDetails = (currentClazzId, queryStartDate, queryEndDate, maxCheckinTimes, checkinPrice) => {
  debug('----------------------- queryClazzWeeklyWithdrawDetails -----------------------');
  debug(currentClazzId);
  debug(queryStartDate);
  debug(queryEndDate);
  debug(maxCheckinTimes);
  debug(checkinPrice);

  // 查询班级退款历史
  return clazzWithdrawMapper.query({
        clazz: currentClazzId
      })
      .then((clazzWithdrawList) => {
        debug(clazzWithdrawList);

        // 确保参数合法
        for (let clazzWithdrawItem of clazzWithdrawList) {
          // 获取班级退款条目的startDate，及 最大的endDate
          const startDate = clazzWithdrawItem.startDate,
              endDate = clazzWithdrawItem.endDate;

          debug(startDate);
          debug(endDate);

          // 检查开始日期
          if (moment(queryStartDate).isBetween(startDate, endDate, null, '[]') ||
              moment(endDate).isBetween(queryStartDate, queryEndDate, null, '[]')) {
            return Promise.reject(commonError.PARAMETER_ERROR('开始时间非法'));
          }

          // 检查结束日期
          if (moment(queryEndDate).isBetween(startDate, endDate, null, '[]') ||
              moment(startDate).isBetween(queryStartDate, queryEndDate, null, '[]')) {
            return Promise.reject(commonError.PARAMETER_ERROR('结束时间非法'));
          }
        }

        // 查询开始时间内打卡情况
        const queryClazzCheckinListPromise = checkinService.queryCheckinList(null, currentClazzId, queryStartDate, queryEndDate);

        // 查询班级人员情况
        const quryClazzUserListPromise = clazzAccountService.searchClazzUsers(
            currentClazzId,
            [enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.CLOSE.key],
            null,
            []
        );

        return Promise.all([queryClazzCheckinListPromise, quryClazzUserListPromise]);
      })
      .then((results) => {
        const checkinList = results[0],
            userList = results[1];

        debug(checkinList);
        debug(userList);
        // 构造 id -> user 的字典表
        const userMap = _.keyBy(userList, 'id');

        const userWithdrawDetailList = _.chain(checkinList)
            .filter((checkinItem) => checkinItem.status === enumModel.checkinStatusEnum.NORMAL.key)
            .groupBy('userId')
            .reduce((withdrawDetailList, checkinList, userId) => {
                  const userScore = _.sumBy(checkinList, 'score'),
                      userInfo = userMap[userId];

                  if (_.isNil(userInfo)) {
                    winston.error('不存在的用户信息: %d', userId);
                  } else {
                    withdrawDetailList.push({
                      userInfo: userInfo,
                      score: userScore,
                      withdrawMoney: _.min([maxCheckinTimes, userScore]) * checkinPrice
                    });
                  }

                  return withdrawDetailList;
                },
                []
            )
            .value();

        debug(userWithdrawDetailList);

        // 总退款金额
        const totalWithdrawMoney = _.sumBy(userWithdrawDetailList, 'withdrawMoney');
        // 用户列表大小，可能为零
        const userSize = _.size(userList);
        // 总天数 = 开始日期 与 结束日期 间的 day 天数差； 需 +1
        const totalDays = moment(queryEndDate).diff(queryStartDate, 'day') + 1;
        // 打卡率 = 打卡列表大小 / ((用户列表大小 || 1) * 总天数)
        const checkinRate = _.size(checkinList) / ((userSize || 1) * totalDays);

        debug(totalWithdrawMoney);
        debug(checkinRate);

        return {
          totalWithdrawMoney: totalWithdrawMoney, // 总退款金额
          checkinRate: checkinRate,               // 打卡率
          withdrawList: userWithdrawDetailList,   // 退款列表
          checkinList: checkinList,               // 打卡列表
          userList: userList                      // 用户列表
        };
      });
};

/**
 * 创建班级周退款记录
 *
 * @param clazzWeeklyWithdrawItem
 * @returns {clazzWeeklyWithdrawItem}
 */
pub.createClazzWeeklyWithdrawItem = (clazzWeeklyWithdrawItem) => {
  if (!_.isPlainObject(clazzWeeklyWithdrawItem) || !_.isNil(clazzWeeklyWithdrawItem.id)) {
    winston.error('新建班级周退款记录失败，参数错误！！！clazzWeeklyWithdrawItem: %j', clazzWeeklyWithdrawItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzWithdrawMapper.create(clazzWeeklyWithdrawItem);
};

/**
 * 新建用户提款记录
 *
 * @param userId
 * @param score
 * @param applyMoney     单位：元
 * @param remark
 * @returns {*}
 */
pub.createUserWithdrawItem = (userId, score, applyMoney, remark) => {
  if (_.isNil(userId) || !_.isSafeInteger(applyMoney) || applyMoney <= 0) {
    winston.error(
        '新建用户提现记录失败，参数错误！！！userId: %s, score: %s, applyMoney: %s, remark: %s',
        userId,
        score,
        applyMoney,
        remark
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const withdrawItem = {
    userId: userId,
    payway: enumModel.payWayEnum.wechat.key,
    score: score,
    applyMoney: applyMoney,
    status: enumModel.withdrawStatusEnum.WAITING.key,
    remark: remark,
    applyDate: new Date()
  };

  return userWithdrawMapper.create(withdrawItem);
};

/**
 * 更新班级周退款的用户优币记录列表
 *
 * @param clazzWithdrawId
 * @param userCoinIdList
 * @returns {Promise|Promise.<*>}
 */
pub.updateClazzWeeklyUserCoinRecords = (clazzWithdrawId, userCoinIdList) => {
  if (_.isNil(clazzWithdrawId) || !_.isArray(userCoinIdList)) {
    winston.error('更新班级周退款的用户优币记录列表，参数错误！！！clazzWithdrawId: %s, userCoinIdList: %j', clazzWithdrawId, userCoinIdList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzWithdrawMapper.update(clazzWithdrawId, {
    userCoinRecords: userCoinIdList
  })
};

/**
 * 删除提现记录
 */
pub.removeWithdrawRecordbyId = (userWithdrawId) =>{
  if (_.isNil(userWithdrawId)) {
    winston.error('提现ID参数错误！！！clazzWithdrawId: %s', userWithdrawId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return userWithdrawMapper.destroy(userWithdrawId);
};


/**
 * 根据id获取退款详情
 *
 * @param clazzWithdrawId
 * @returns {*}
 */
pub.fetchClazzWithdrawItemById = (clazzWithdrawId) => {
  if (_.isNil(clazzWithdrawId)) {
    winston.error('根据id获取班级退款条目失败，参数错误！！！clazzWithdrawId: %s', clazzWithdrawId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzWithdrawMapper.fetchById(clazzWithdrawId);
};

module.exports = pub;
