'use strict';

const _ = require('lodash');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const userService = require('./user.service');
const clazzService = require('./clazz.service');
const userCoinService = require('./userCoin.service');
const clazzAccountService = require('./clazzAccount.service');

const commonUtil = require('./util/common.util');

const promotionUserMapper = require('../dao/mysql_mapper/promotionUser.mapper');
const promotionUserIncomeMapper = require('../dao/mysql_mapper/promotionUserIncome.mapper');
const promotionUserRelationMapper = require('../dao/mysql_mapper/PromotionUserRelation.mapper');

/**
 * 生成不存在于 existedKeys 中的唯一key
 * @param existedKeys
 * @returns {string}
 */
const generateUniqueKey = (existedKeys) => {
  let nextKey;

  const library = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  do {
    nextKey = commonUtil.generateRandomString(6, library);
  } while (_.includes(existedKeys, nextKey));

  return nextKey;
};

const pub = {};

/**
 * 根据userId获取推广者信息
 *
 * @param promoterUserId
 * @returns {*}
 */
pub.fetchPromotionUserByUserId = (promoterUserId) => {
  if (_.isNil(promoterUserId)) {
    winston.error('根据推广用户id获取详情失败，参数错误！promoterUserId: %s', promoterUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(promoterUserId);

  return promotionUserMapper.fetchOneByParam({ userId: promoterUserId });
};

/**
 * 获取推广用户列表
 *
 * @param limit
 * @returns {*}
 */
pub.fetchSampledPromotionUserList = (limit = 15) => {
  if (!_.isSafeInteger(limit) || limit < 0) {
    winston.error('获取样例推广用户失败，参数错误！limit: %s', limit);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  if (limit === 0) {
    return Promise.resolve([]);
  }

  return promotionUserMapper.fetchAllByParam({})
      .then((promotionUserList) => {
        debug(promotionUserList);

        const sampleUserIdList = _.chain(promotionUserList)
            .sampleSize(15)
            .map('userId')
            .value();

        return userService.queryUser(null, sampleUserIdList)
            .then((userList) => {
              return {
                joinedCount: _.size(promotionUserList),
                joinedUserList: userList
              };
            });
      });
};

/**
 * 新建推广用户
 *
 * @param promoterUserId
 * @param qrcode
 * @returns {Promise.<*>|Promise}
 */
pub.createPromotionUser = (promoterUserId, qrcode) => {
  if (_.isNil(promoterUserId) || _.isNil(qrcode)) {
    winston.error('新建推广用户失败，参数错误！promoterUserId: %s, qrcode: %s', promoterUserId, qrcode);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(promoterUserId);
  debug(qrcode);

  return promotionUserMapper.fetchAllByParam({})
      .then((promotionUserList) => {
        debug(promotionUserList);

        const existedPromotionKeys = _.map(promotionUserList, 'key');

        debug(existedPromotionKeys);

        const uniqueKey = generateUniqueKey(existedPromotionKeys);

        debug(uniqueKey);

        return promotionUserMapper.create({
          userId: promoterUserId,
          qrcode: qrcode,
          key: uniqueKey,
          joinDate: new Date()
        });
      });
};

/**
 * 获取推广收入详情
 *
 * @param promoterUserId
 * @returns {Promise.<*>|Promise}
 */
pub.fetchPromotionIncomeMap = (promoterUserId) => {
  if (_.isNil(promoterUserId)) {
    winston.error('获取推广收入详情失败，参数错误！promoterUserId: %s', promoterUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(promoterUserId);

  // 获取用户推广收益
  return promotionUserIncomeMapper.fetchAllByParam({
        promoterUserId: promoterUserId
      })
      .then((incomeList) => {
        debug(incomeList);

        const defaultIncomeMap = _.reduce(
            enumModel.promotionIncomeStatusEnum,
            (prev, value, key) => {
              prev[key] = 0;
              return prev;
            },
            {}
        );

        debug(defaultIncomeMap);

        return _.chain(incomeList)
            .groupBy('status')
            .reduce(
                (prev, incomeList, status) => {
                  debug(incomeList);
                  debug(status);

                  prev[status] = _.chain(incomeList).map('promoterUserIncome').sum().value();

                  return prev;
                },
                defaultIncomeMap
            )
            .value();
      });
};

/**
 * 获取根据用户分组的推广收益列表
 *
 * @param promoterUserId
 * @returns {*}
 */
pub.fetchUserGroupedPromotionIncomes = (promoterUserId) => {
  if (_.isNil(promoterUserId)) {
    winston.error('获取根据用户分组的推广收益列表失败，参数错误: promoterUserId: %s', promoterUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(promoterUserId);

  const fetchInviteeUsersPromise = promotionUserRelationMapper.fetchAllByParam({
        promoterUserId: promoterUserId
      })
      .then((relationList) => {
        debug(relationList);

        const inviteeUserIdList = _.map(relationList, 'inviteeUserId');

        return userService.queryUser(null, inviteeUserIdList);
      });

  // 获取用户推广收益
  const fetchPromotionIncomesPromise = promotionUserIncomeMapper.fetchAllByParam({
    promoterUserId: promoterUserId
  });

  return Promise.all([fetchInviteeUsersPromise, fetchPromotionIncomesPromise])
      .then(([inviteeUserList, incomeList]) => {
        debug(incomeList);
        debug(incomeList);

        const inviteeUserIncomeMap = _.groupBy(incomeList, 'inviteeUserId');

        _.forEach(inviteeUserList, (inviteeUser) => {
          const inviteeUserIncomeList = _.get(inviteeUserIncomeMap, inviteeUser.id, []);

          const clazzCount = _.size(inviteeUserIncomeList);
          const incomeSum = _.chain(inviteeUserIncomeList)
              .reject(['status', enumModel.promotionIncomeStatusEnum.CANCELED.key])
              .map('promoterUserIncome')
              .sum()
              .value();

          debug(clazzCount);
          debug(incomeSum);

          inviteeUser.promotionInfo = {
            clazzCount: clazzCount,
            incomeSum: incomeSum
          };
        });

        return inviteeUserList;
      });
};

/**
 * 根据邀请者id获取推广用户收益列表
 *
 * @param inviteeUserId
 * @param promoterUserId
 * @returns {*}
 */
pub.fetchPromotionIncomesByInviteeId = (inviteeUserId, promoterUserId) => {
  if (_.isNil(promoterUserId) || _.isNil(promoterUserId)) {
    winston.error('根据邀请者id获取推广用户收益列表失败，参数错误！inviteeUserId: %s, promoterUserId: %s', inviteeUserId, promoterUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(inviteeUserId);
  debug(promoterUserId);

  const fetchPromotionRelationPromise = promotionUserRelationMapper.fetchOneByParam({
    promoterUserId: promoterUserId,
    inviteeUserId: inviteeUserId
  });

  const fetchInviteeUserPromise = userService.fetchById(inviteeUserId);

  // 获取用户推广收益
  const fetchInviteeIncomesPromise = promotionUserIncomeMapper.fetchAllByParam({
    promoterUserId: promoterUserId,
    inviteeUserId: inviteeUserId
  });

  return Promise.all([fetchPromotionRelationPromise, fetchInviteeIncomesPromise, fetchInviteeUserPromise])
      .then(([promotionRelation, incomeList, inviteeUser]) => {
        debug(promotionRelation);
        debug(incomeList);
        debug(inviteeUser);

        if (_.isNil(promotionRelation) || _.isNil(inviteeUser)) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        const clazzIdList = _.map(incomeList, 'clazzId');

        const fetchClazzAccountListPromise = clazzAccountService.queryClazzAccountByClazzId(clazzIdList, inviteeUserId);
        const fetchClazzListPromise = clazzService.queryClazzes(null, clazzIdList, null, null);

        return Promise.all([fetchClazzAccountListPromise, fetchClazzListPromise])
            .then(([clazzAccountList, clazzList]) => {
              debug(clazzAccountList);
              debug(clazzList);

              const clazzAccountMap = _.keyBy(clazzAccountList, 'clazzId'),
                  clazzMap = _.keyBy(clazzList, 'id');

              const clazzCount = _.size(incomeList),
                  cancelledJoinStatus = enumModel.clazzJoinStatusEnum.CANCELED.key,
                  cancelIncomeStatus = enumModel.promotionIncomeStatusEnum.CANCELED.key;

              let incomeSum = 0;
              _.forEach(incomeList, (income) => {
                const clazzId = income.clazzId;

                const clazzInfo = clazzMap[clazzId];
                clazzInfo.clazzJoinStatus = _.get(clazzAccountMap, [clazzId, 'status'], cancelledJoinStatus);

                income.clazzInfo = clazzInfo;
                // 去除飞走的额收益
                if (income.status !== cancelIncomeStatus) {
                  incomeSum += income.promoterUserIncome;
                }
              });

              debug(clazzCount);
              debug(incomeSum);

              inviteeUser.promotionInfo = {
                clazzCount: clazzCount,
                incomeSum: incomeSum,
                incomeList: incomeList
              };

              return inviteeUser;
            });
      });
};

/**
 * 获取推广用户收益列表
 *
 * @param promoterUserId
 * @returns {Promise.<*>|Promise}
 */
pub.fetchPromotionIncomesByPromoterId = (promoterUserId) => {
  if (_.isNil(promoterUserId)) {
    winston.error('获取推广用户收益列表失败，参数错误：promoterUserId： %s', promoterUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(promoterUserId);

  // 获取用户推广收益
  return promotionUserIncomeMapper.fetchAllByParam({
        promoterUserId: promoterUserId
      })
      .then((incomeList) => {
        debug(incomeList);

        const inviteeUserIdList = [], clazzIdList = [];

        _.forEach(incomeList, (incomeItem) => {
          inviteeUserIdList.push(incomeItem.inviteeUserId);
          clazzIdList.push(incomeItem.clazzId);
        });

        const fetchInviteeUserListPromise = userService.queryUser(null, inviteeUserIdList);
        const fetchInviteeClazzPromise = clazzService.queryClazzes(null, clazzIdList, null, null);

        return Promise.all([fetchInviteeUserListPromise, fetchInviteeClazzPromise])
            .then(([inviteeUserList, clazzList]) => {
              const inviteeUserMap = _.keyBy(inviteeUserList, 'id');
              const clazzMap = _.keyBy(clazzList, 'id');

              _.forEach(incomeList, (incomeItem) => {
                incomeItem.userInfo = inviteeUserMap[incomeItem.inviteeUserId];
                incomeItem.clazzInfo = clazzMap[incomeItem.clazzId];
              });

              return incomeList;
            });
      });
};

/**
 * 将收益提现到优币中
 *
 * @param promoterUserId
 * @returns {Promise|Promise.<*>}
 */
pub.transferIncomeToCoin = (promoterUserId) => {
  if (_.isNil(promoterUserId)) {
    winston.error('将收益提现到优币中失败，参数错误：promoterUserId：%s', promoterUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(promoterUserId);

  // 获取用户推广收益
  return promotionUserIncomeMapper.fetchAllByParam({
        promoterUserId: promoterUserId,
        status: enumModel.promotionIncomeStatusEnum.AVAILABLE.key
      })
      .then((availableIncomeList) => {
        debug(availableIncomeList);

        const availableIncomeSum = _.chain(availableIncomeList).map('promoterUserIncome').sum().value();

        if (availableIncomeSum <= 0) {
          return Promise.reject(commonError.PARAMETER_ERROR('暂无可提现收益'));
        }

        const coinTitle = `${ moment().format('YYYY-MM-DD') }推广提现`;
        const transferPromise = userCoinService.createUserCoin({
          userId: promoterUserId, // 使用当前学员的id
          coinChange: availableIncomeSum / 100,
          title: coinTitle,
          bizType: enumModel.coinBizTypeEnum.PROMOTION.key,
          remark: coinTitle,
          changeDate: new Date()
        });
        const updateIncomeListPromise = _.map(
            availableIncomeList,
            (incomeItem) => promotionUserIncomeMapper.update({
              id: incomeItem.id,
              status: enumModel.promotionIncomeStatusEnum.COINED.key
            })
        );

        return Promise.all([transferPromise, ...updateIncomeListPromise]);
      })
      .then(([coinItem, ...incomeList]) => {
        debug(coinItem);
        debug(incomeList);

        return coinItem;
      });
};

/**
 * 获取邀请者推荐优惠信息
 *
 * @param inviteeUserId
 * @returns {*}
 */
pub.fetchInviteePromotionOfferInfo = (inviteeUserId) => {
  if (_.isNil(inviteeUserId)) {
    winston.error('获取邀请者推荐优惠信息失败，参数错误！inviteeUserId: %s', inviteeUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const fetchPromotionRelationPromise = promotionUserRelationMapper.fetchOneByParam({
        inviteeUserId: inviteeUserId,
        type: enumModel.promotionTypeEnum.REGISTRATION_INVITATION.key
      })
      .then((promotionRelation) => {
        debug(promotionRelation);

        if (_.isNil(promotionRelation)) {
          return null;
        }

        const promoterUserId = promotionRelation.promoterUserId;

        const fetchPromoterUserPromise = promotionUserMapper.fetchOneByParam({
          userId: promoterUserId
        });

        const fetchUserPromise = userService.fetchById(promoterUserId);

        return Promise.all([fetchPromoterUserPromise, fetchUserPromise])
            .then(([promoterUser, user]) => {
              debug(promoterUser);
              debug(user);

              promoterUser.userInfo = user;

              return promoterUser;
            })
      });

  const queryJoinedClazzCountPromise = clazzAccountService.countUserJoinedPromotionClazzes(inviteeUserId);

  return Promise.all([fetchPromotionRelationPromise, queryJoinedClazzCountPromise])
      .then(([promoterUser, joinedClazzCount]) => {
        debug(promoterUser);
        debug(joinedClazzCount);

        return {
          promoterUser: promoterUser,
          joinedClazzCount: joinedClazzCount
        };
      });
};

/**
 * 根据推广码获取优惠信息
 *
 * @param promotionCode
 * @returns {Promise|Promise.<*>}
 */
pub.fetchPromotionUserByPromotionCode = (promotionCode) => {
  if (!_.isString(promotionCode) || _.isEmpty(promotionCode)) {
    winston.error('根据推广码获取优惠信息失败，参数错误！promotionCode： %s', promotionCode);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 根据推广码获取相应的推广者
  return promotionUserMapper.fetchOneByParam({
        key: promotionCode
      })
      .then((promoterUser) => {
        if (_.isNil(promoterUser)) {
          return promoterUser;
        }

        // 获取推广者用户信息
        return userService.fetchById(promoterUser.userId)
            .then((userItem) => {
              promoterUser.userInfo = userItem;

              return promoterUser;
            });
      });
};

/**
 * 获取推广者与被邀者的关联关系
 *
 * @param promoterUserId
 * @param inviteeUserId
 * @returns {*}
 */
pub.fetchPromotionRelation = (promoterUserId, inviteeUserId) => {
  if (_.isNil(promoterUserId) || _.isNil(inviteeUserId)) {
    winston.error('获取推广者与被邀者的关联关系失败，参数错误！promoterUserId: %s, inviteeUserId: %s', promoterUserId, inviteeUserId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return promotionUserRelationMapper.fetchOneByParam({
    promoterUserId: promoterUserId,
    inviteeUserId: inviteeUserId
  });
};

/**
 * 新建推广关联关系
 *
 * @param promotionId
 * @param promoterUserId
 * @param inviteeUserId
 * @param promotionType
 * @returns {*}
 */
pub.createPromotionRelation = (promotionId, promoterUserId, inviteeUserId, promotionType) => {
  debug(promotionId);
  debug(promoterUserId);
  debug(inviteeUserId);
  debug(promotionType);

  if (_.isNil(promotionId) || _.isNil(promoterUserId) || _.isNil(inviteeUserId)
      || _.isNil(enumModel.getEnumByKey(promotionType, enumModel.promotionTypeEnum))) {
    winston.error('新建推广关联关系失败，参数错误！promotionId: %s, promoterUserId: %s, inviteeUserId: %s, promotionType: %s', promotionId, promoterUserId, inviteeUserId, promotionType);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return promotionUserRelationMapper.create({
    promotionId: promotionId,
    promoterUserId: promoterUserId,
    inviteeUserId: inviteeUserId,
    type: promotionType,
    invitedTime: new Date()
  })
};

/**
 * 新建推广收益
 *
 * @param incomeItem
 * @returns {*}
 */
pub.createPromotionIncome = (incomeItem) => {
  debug(incomeItem);

  if (!_.isPlainObject(incomeItem) || !_.isNil(incomeItem.id)) {
    winston.error('新建推广收益失败，参数错误！incomItem: %j', incomeItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return promotionUserIncomeMapper.create(incomeItem);
};

/**
 * 根据被邀请者userId及clazzId获取推广收入列表
 *
 * @param inviteeUserId
 * @param clazzId
 * @returns {*}
 */
pub.fetchPromotionIncomesByClazzId = (inviteeUserId, clazzId) => {
  debug(inviteeUserId);
  debug(clazzId);

  if (_.isNil(inviteeUserId) || _.isNil(clazzId)) {
    winston.error('根据被邀请者userId及clazzId获取推广收入列表失败，参数错误！inviteeUserId: %s, clazzId: %s', inviteeUserId, clazzId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return promotionUserIncomeMapper.fetchAllByParam({
    inviteeUserId: inviteeUserId,
    clazzId: clazzId
  });
};

/**
 * 更新推广收益
 *
 * @param incomeItem
 * @returns {*}
 */
pub.updatePromotionIncomeById = (incomeItem) => {
  if (!_.isPlainObject(incomeItem) || _.isNil(incomeItem.id)) {
    winston.error('更新推广收益失败，参数错误！incomeItem: %j', incomeItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return promotionUserIncomeMapper.update(incomeItem);
};

/**
 * 分页查询推广收益
 * @param userIds
 * @param status
 * @param pageNumber
 * @param pageSize
 * @returns {*}
 */
pub.queryPagedPromotionIncomes = (userIds, status, pageNumber = 1, pageSize = 10) => {
  if (!_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
    winston.error('分页查询推广收益失败，参数错误！userIds: %s, status: %s, pageNumber: %s, pageSize: %s', userIds, status, pageNumber, pageSize);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = {};
  if (_.isArray(userIds)) {
    if (_.isEmpty(userIds)) {
      return Promise.resolve({
        values: [],
        pageNumber: 1,
        pageSize: pageSize,
        itemSize: 0
      });
    } else {
      queryParam.promoterUserId = userIds;
    }
  }
  if (!_.isNil(enumModel.getEnumByKey(status, enumModel.promotionIncomeStatusEnum))) {
    queryParam.status = status;
  }

  debug(queryParam);

  return promotionUserIncomeMapper.fetchPagedPromotionIncom(queryParam, pageNumber, pageSize);
};

module.exports = pub;
