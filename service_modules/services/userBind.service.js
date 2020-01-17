'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const clazzAccountService = require('./clazzAccount.service');

const clazzUtil = require('./util/clazz.util');
const userBindUtil = require('./util/userBind.util');

const userMapper = require('../dao/mysql_mapper/user.mapper');
const userBindMapper = require('../dao/mysql_mapper/userBind.mapper');
const userEasemobRelationMapper = require('../dao/mysql_mapper/userEasemobRelation.mapper');

const easemobComponent = require('./component/easemob.component');

/**
 * 获取学员环信好友第三方id列表
 *
 * @param clazzId
 * @param userBindId
 * @returns {Promise.<TResult>|Promise}
 */
const fetchPartnerBindIdList = (clazzId, userBindId) => {
  const fetchActivePartnerListPromise = userEasemobRelationMapper.queryAll({
    clazzId: clazzId,
    userBindId: userBindId
  });

  const fetchPassivePartnerListPromise = userEasemobRelationMapper.queryAll({
    clazzId: clazzId,
    partnerBindId: userBindId
  });

  return Promise.all([fetchActivePartnerListPromise, fetchPassivePartnerListPromise])
      .then((result) => {
        const activePartnerList = result[0],
            passivePartnerList = result[1];

        const activePartnerBindIdList = _.map(activePartnerList, 'partnerBindId'),
            passivePartnerBindList = _.map(passivePartnerList, 'userBindId');

        return _.flatten([activePartnerBindIdList, passivePartnerBindList])
      });
};

const pub = {};

/**
 * 根据类型及accountName获取第三方账户信息
 *
 * @param bindType
 * @param accountName
 * @returns {*}
 */
pub.fetchUserBind = (bindType, accountName) => {
  if (_.isNil(enumModel.getEnumByKey(bindType, enumModel.userBindTypeEnum) || _.isNil(accountName))) {
    winston.error('获取第三方用户信息失败，参数错误！！！bindType: %s, accountName: %s', bindType, accountName);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug('bindType: %s, accountName: %s', bindType, accountName);

  return userBindMapper.fetchByParam({
    'type': bindType,
    'accountName': accountName
  });
};

pub.fetchUserBindByUserId = (bindType, userId) => {
  debug(bindType);
  debug(userId);

  if (_.isNil(enumModel.getEnumByKey(bindType, enumModel.userBindTypeEnum) || _.isNil(userId))) {
    winston.error('获取第三方用户信息失败，参数错误！！！bindType: %s, userId: %s', bindType, userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userBindMapper.fetchByParam({
    'type': bindType,
    'userId': userId
  });
};

/**
 * 获取所有相关第三方账户
 *
 * @param userId
 * @returns {*}
 */
pub.fetchAllBindUser = (userId) => {
  debug(userId);

  if (_.isNil(userId)) {
    winston.error('获取第三方用户列表失败，参数错误！！！userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userBindMapper.queryAll({
    userId: userId
  });
};

/**
 * 新建第三方账户
 *
 * @param userId
 * @param userBindType
 * @param accountName
 * @param password
 * @returns {*}
 */
pub.createBindUser = (userId, userBindType, accountName, password) => {
  if (_.isNil(userId) || _.isNil(enumModel.getEnumByKey(userBindType, enumModel.userBindTypeEnum)) || _.isNil(accountName)) {
    winston.error('新建第三方账户失败，参数错误！！！userId: %s, userBindType: %s, accountName: %s', userId, userBindType, accountName);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const userBindItem = {
    userId: userId,
    type: userBindType,
    uuid: accountName,
    accountName: accountName
  };
  if (!_.isNil(password)) {
    userBindItem.password = password;
  }

  return userBindMapper.create(userBindItem);
};

/**
 * 更新第三方帐号信息
 *
 * @param userBindItem
 * @returns {Promise.<*>}
 */
pub.updateUserBindItem = (userBindItem) => {
  debug(userBindItem);

  if (!_.isPlainObject(userBindItem) || _.isNil(userBindItem.id)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return userBindMapper.update(userBindItem);
};

/***********************************************************************************************************************
 *                                                    环信
 ***********************************************************************************************************************/

/**
 * 注册环信第三方账户
 *
 * @param clazzItem
 * @param userItem
 * @returns {Promise.<TResult>|Promise}
 */
pub.registerEasemobBindUser = (clazzItem, userItem) => {
  if (!_.isPlainObject(clazzItem) && !_.isPlainObject(userItem)) {
    winston.error('注册环信第三方账户失败，参数错误！！！clazzItem: %j, userItem: %j', clazzItem, userItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return easemobComponent.registerUserInEasemob(clazzItem, userItem)
      .catch((error) => {
        winston.error(error);

        return Promise.reject(commonError.BIZ_FAIL_ERROR('注册环信第三方账户失败'));
      })
      .then((easemobUserItem) => {
        debug(easemobUserItem);

        return userBindMapper.create({
              userId: userItem.id,
              type: enumModel.userBindTypeEnum.EASEMOB.key,
              uuid: easemobUserItem.uuid,
              accountName: `${ easemobUserItem.username }`,
              password: easemobUserItem.password
            })
            .catch((error) => {
              winston.error(error);

              return Promise.reject(commonError.BIZ_FAIL_ERROR('保存环信第三方账户失败'));
            });
      });
};

/**
 * 获取环信好友信息
 *
 * @param clazzId
 * @param userBindId
 * @returns {*}
 */
pub.fetchClazzEasemobPartnerList = (clazzId, userBindId) => {
  if (_.isNil(clazzId) || _.isNil(userBindId)) {
    winston.error('获取环信好友信息失败，参数错误！！！clazzId: %s, userBindId: %s', clazzId, userBindId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return fetchPartnerBindIdList(clazzId, userBindId)
      .then((partnerBindIdList) => {
        debug(partnerBindIdList);

        return userBindMapper.queryAll({ id: partnerBindIdList });
      })
      .then((userBindList) => {
        const userIdList = _.map(userBindList, 'userId');
        const userIdUserBindMap = _.keyBy(userBindList, 'userId');

        return userMapper.queryAll({
              id: userIdList
            })
            .then((userList) => {
              debug(userList);

              _.forEach(userList, (userItem) => {
                userItem.bindInfo = userIdUserBindMap[userItem.id];
              });

              return userList;
            })
      });
};

/**
 * 获取环信好友第三方id
 *
 * @param clazzId
 * @param userBindId
 * @returns {Promise|Promise.<*>}
 */
pub.fetchClazzEasemobPartnerBindIdList = (clazzId, userBindId) => {
  if (_.isNil(clazzId) || _.isNil(userBindId)) {
    winston.error('获取环信好友信息失败，参数错误！！！clazzId: %s, userBindId: %s', clazzId, userBindId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return fetchPartnerBindIdList(clazzId, userBindId);
};

/**
 * 添加环信好友关系
 *
 * @param clazzId
 * @param userBindId
 * @param partnerBindIdList
 * @returns {*}
 */
pub.addUserClazzEasemobPartnerList = (clazzId, userBindId, partnerBindIdList) => {
  if (_.isNil(clazzId) || _.isNil(userBindId) || _.isNil(partnerBindIdList) || !_.isArray(partnerBindIdList)) {
    winston.error('添加环信好友失败，参数错误！！！clazzId: %s, userBindId: %s, partnerBindIdList: %j', clazzId, userBindId, partnerBindIdList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  if (_.isEmpty(partnerBindIdList)) {
    return Promise.resolve([]);
  }

  const addPartnerPromiseList = _.map(partnerBindIdList, (partnerBindId) => {
    return userEasemobRelationMapper.create({
      clazzId: clazzId,
      userBindId: userBindId,
      partnerBindId: partnerBindId,
      status: enumModel.userEasemobRelationStatusEnum.PROCESSING.key
    });
  });

  return Promise.all(addPartnerPromiseList);
};

/**
 * 查询班级内学员除 excludeUserIds 外的第三方帐号列表
 *
 * @param clazzItem
 * @param keyword
 * @param excludeUserIds
 */
pub.queryClazzStudentEasemobUserBindList = (clazzItem, keyword, excludeUserIds) => {
  if (!_.isPlainObject(clazzItem) || _.isNil(clazzItem.id) || !_.isArray(excludeUserIds)) {
    winston.error('查询学员环信帐号列表失败，参数错误！！！clazzItem: %j, excludeUserIds: %j', clazzItem, excludeUserIds);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzAccountService.searchClazzUsers(
      clazzItem.id,
      [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key],
      keyword,
      excludeUserIds)
      .then((clazzUserList) => {
        debug(clazzUserList);
        const checkIsClazzTeacher = clazzUtil.checkIsClazzTeacher(clazzItem);

        // 过滤掉班级笃师
        const clazzEasemobUsernameList = _.chain(clazzUserList)
            .filter((userItem) => !checkIsClazzTeacher(userItem.openId))
            .map((userItem) => userBindUtil.getEasemobUsername(false, userItem, clazzItem))
            .value();

        debug(clazzEasemobUsernameList);

        return userBindMapper.queryAll({
              accountName: clazzEasemobUsernameList,
              type: enumModel.userBindTypeEnum.EASEMOB.key
            })
            .then((userBindList) => {
              const userIdMap = _.keyBy(clazzUserList, 'id');

              _.forEach(userBindList, (userBindItem) => {
                userBindItem.userInfo = userIdMap[userBindItem.userId];
              });

              return userBindList;
            });
      });
};

/**
 * 根据id获取环信第三方账户信息
 *
 * @param userBindId
 * @returns {*}
 */
pub.fetchEasemobUserBindById = (userBindId) => {
  return userBindMapper.fetchByParam({
    id: userBindId,
    type: enumModel.userBindTypeEnum.EASEMOB.key
  });
};

/**
 * 第三方账号信息分页查询用户信息
 */
pub.pagedQuery = (queryParam) => {
  return userBindMapper.queryPaged(queryParam, queryParam.pageSize, queryParam.pageNumber)
}

module.exports = pub;
