'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');

const systemConfig = require('../../config/config');
const commonError = require('./model/common.error');

const enumModel = require('./model/enum');
const cacheWrapComponent = require('./component/cacheWrap.component');

const encryptUtil = require('./util/encrypt.util');
const accountUtil = require('../services/util/account.util');

const userMapper = require('../dao/mysql_mapper/user.mapper');

const hashPasswordPromise = encryptUtil.getHashPasswordPromiseFunction(systemConfig.USER_OPTIONS.saltRounds);

const wechatCustomMessage = require('../lib/wechat.custom.message');

// user redis存储前缀
const REDIS_KEY_PREFIX = `USER`;

// 存储用户数据到缓存中
const saveUserInCache = (userItem) => {
  debug(userItem);

  if (_.isNil(userItem)) {
    return null;
  }

  cacheWrapComponent.set(`${REDIS_KEY_PREFIX}_ID_${userItem.id}`, userItem);
  cacheWrapComponent.set(`${REDIS_KEY_PREFIX}_UNIONID_${userItem.unionid}`, userItem);
  cacheWrapComponent.set(`${REDIS_KEY_PREFIX}_OPENID_${userItem.openId}`, userItem);

  const studentNumber = userItem.studentNumber;

  if (!_.isNil(studentNumber)) {
    cacheWrapComponent.set(`${REDIS_KEY_PREFIX}_STUDENT_NUMBER_${studentNumber}`, userItem);
  }

  return userItem;
};

/**
 * 处理用户关键词搜索参数
 *
 * @param queryParam  搜索参数
 * @param searchType  类型
 * @param keyword     关键词
 * @param status      状态
 * @returns {*}
 */
const concreteUserQueryParam = (queryParam, searchType, keyword, status) => {
  let keywordLikeOperator = {
    operator: 'LIKE',
    value: keyword ? `%${keyword}%` : ''
  };

  debug(keywordLikeOperator);

  switch (searchType) {
    case enumModel.userSearchTypeEnum.STUDENT_NUMBER.key:
      queryParam.studentNumber = keywordLikeOperator;
      break;
    case enumModel.userSearchTypeEnum.NAME.key:
      queryParam.name = keywordLikeOperator;
      break;
    default:
      break;
  }

  if (!_.isNil(enumModel.getEnumByKey(status, enumModel.clazzJoinStatusEnum))) {
    queryParam.status = status;
  }

  return queryParam;
};

const pub = {};

/**
 * 根据unionId获取用户数据
 *
 * @param unionId
 * @returns {Promise}
 */
pub.fetchByUnionid = (unionId) => {
  const fetchUserByUnionId = (unionId) => userMapper.fetchByParam({unionid: unionId});

  return cacheWrapComponent.wrap(`${REDIS_KEY_PREFIX}_UNIONID`, fetchUserByUnionId, unionId)
      .then(saveUserInCache);
};

/**
 * 根据userId获取用户信息
 * @param userId
 * @returns {Promise}
 */
pub.fetchById = (userId) => {
  const fetchById = (userId) => userMapper.fetchByParam({id: userId});

  return cacheWrapComponent.wrap(`${REDIS_KEY_PREFIX}_ID`, fetchById, userId)
      .then(saveUserInCache);
};

/**
 * 根据openId获取用户数据
 *
 * @param openId
 * @returns {Promise}
 */
pub.fetchByOpenId = (openId) => {
  const fetchByOpenId = (openId) => userMapper.fetchByParam({openId: openId});

  return cacheWrapComponent.wrap(`${REDIS_KEY_PREFIX}_OPENID`, fetchByOpenId, openId)
      .then(saveUserInCache);
};

/**
 * 通过学号查询用户对象
 * @param studentNumber
 * @return {Promise|Bluebird<any>|*|Bluebird<R | never>|PromiseLike<T | never>|Promise<T | never>}
 */
pub.fetchByStudentNumber = (studentNumber) => {
  const fetchByStudentNumber = (studentNumber) => userMapper.fetchByParam({studentNumber: studentNumber});

  return cacheWrapComponent.wrap(`${REDIS_KEY_PREFIX}_STUDENT_NUMBER`, fetchByStudentNumber, studentNumber)
      .then(saveUserInCache);
};

/**
 * 普通学员登录，获取个人信息
 * 注意：改方法仅为测试用，勿在生产环境使用
 *
 * @param openId
 * @param password
 * @returns {Promise}
 */
pub.login = pub.fetchByOpenId;

/**
 * 根据 userId 和 userItem 来更新对应 user model
 *
 * @param userId
 * @param userItem
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.updateUserItem = (userId, userItem) => {
  if (_.isNil(userId) || !_.isPlainObject(userItem)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 加入id
  userItem.id = userId;

  return userMapper.update(userItem)
      .then((updatedUserItem) => {
        debug(updatedUserItem);

        saveUserInCache(updatedUserItem);

        return updatedUserItem;
      });
};


/**
 * 查询学号或姓名like keyword且在userIds中的用户列表
 *
 * @param keyword   like关键词
 * @param userIds   用户id列表，可为空
 * @returns {*}
 */
pub.queryUser = (keyword, userIds) => {
  if (!_.isString(keyword) && !_.isArray(userIds)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 构建queryParam
  let queryParam = {};
  if (_.isString(keyword) && keyword !== '') {
    queryParam.keyword = keyword;
  }
  if (_.isArray(userIds)) {
    queryParam.id = userIds;
  } else {
    winston.error('userService的queryUser方法参数错误，userIds应当为数组！！！ userIds: %s', userIds);
    return Promise.resolve([]);
  }

  debug(queryParam);
  return userMapper.queryAll(queryParam);
};

/**
 * 检查用户是否已经设置密码
 * todo 移动到util中
 *
 * @param userItem
 * @returns {boolean}
 */
pub.checkHasSetPassword = (userItem) => {
  return !_.isNil(userItem.saltHashedPassword);
};

/**
 * 更新用户密码
 *
 * @param userItem
 * @param oldPassword
 * @param password
 * @returns {Promise|Promise.<TResult>}
 */
pub.setUserPassword = (userItem, oldPassword, password) => {
  let comparePromise;
  if (_.isNil(userItem.saltHashedPassword) && _.isNil(oldPassword)) {
    comparePromise = Promise.resolve(true);
  } else {
    comparePromise = encryptUtil.comparePasswordPromise(oldPassword, userItem.saltHashedPassword);
  }

  return comparePromise.then(
      (isValidPassword) => {
        debug(isValidPassword);
        if (!isValidPassword) {
          return Promise.reject(commonError.PARAMETER_ERROR('原始密码错误'));
        }

        return hashPasswordPromise(password);
      })
      .then((hashedPassword) => {
        return userMapper.update({id: userItem.id, saltHashedPassword: hashedPassword});
      })
      .then((updatedUserItem) => {
        debug(updatedUserItem);

        saveUserInCache(updatedUserItem);

        return updatedUserItem;
      });
};

/**
 * 使用微信返回的用户信息注册
 *
 * @param userObject => {
 *  nickname: "昵称",
 *  headimgurl: "头像地址",
 *  openid: "微信 openid",
 *  unionid: "微信 unionid",
 *  sex: "性别",
 *  city: "城市"
 * }
 * @returns {*}
 */
pub.wechatSignUp = (userObject) => {
  if (!_.isPlainObject(userObject)) {
    return Promise.reject(commonError.PARAMETER_ERROR('注册用户信息不全！'));
  }

  if (global.IS_DEVLOPMENT_ENVIRONMENT === true) {
    if (_.isNil(userObject.openid)) {
      return Promise.reject(commonError.PARAMETER_ERROR('注册用户信息有误！'));
    }
  } else {
    if (_.isNil(userObject.openid) || _.isNil(userObject.unionid)) {
      return Promise.reject(commonError.PARAMETER_ERROR('注册用户信息有误！'));
    }
  }

  // 抽取信息
  const userItem = {
    name: userObject.nickname,
    headImgUrl: userObject.headimgurl,
    openId: userObject.openid,
    unionid: userObject.unionid,
    sex: userObject.sex,
    city: userObject.city
  };

  return userMapper.create(userItem)
      .then((createdUserItem) => {
        debug(createdUserItem);

        saveUserInCache(createdUserItem);

        return createdUserItem;
      });
};

/**
 * 分页查询用户列表
 *
 * @param pageNumber    页数
 * @param pageSize      页面大小
 * @param searchType    搜索类型
 * @param keyword       关键词
 * @param status        状态  todo 暂不支持
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryPagedUsers = (pageNumber = 1, pageSize = 10, searchType, keyword, status) => {
  const queryParam = concreteUserQueryParam({}, searchType, keyword, status);

  return userMapper.queryPageUsers(queryParam, pageNumber, pageSize);
};


/**
 * 根据关键词查询用户列表
 *
 * @param searchType
 * @param keyword
 * @param status
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryUserBySearchType = (searchType, keyword, status) => {
  const queryParam = concreteUserQueryParam({}, searchType, keyword, status);

  return userMapper.queryAll(queryParam);
};

/**
 * 获取当前最大学号
 *
 * @returns {Promise.<TResult>}
 */
pub.fetchMaxStudentNumber = () => {
  // 选择非 'V' 开头的最大学号
  return userMapper.fetchByParam(
      {'studentNumber': {operator: 'not like', value: 'V%'}},
      '-studentNumber'
  )
      .then((userItem) => {
        debug(userItem);

        return userItem.studentNumber;
      });
};

/**
 * 查询所有学号不为空的学员
 *
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAllStudentNumberedUserList = () => {
  return userMapper.queryAll(
      {
        'studentNumber': {operator: 'is not', value: null}
      });
};

pub.registerUserItem = (userItem) => {
  if (!_.isPlainObject(userItem)) {
    return Promise.reject(commonError.PARAMETER_ERROR('注册用户信息不全！'));
  }

  userItem.isSubscribe = false;

  return userMapper.create(userItem)
      .then((createdUserItem) => {
        debug(createdUserItem);

        saveUserInCache(createdUserItem);

        return createdUserItem;
      });
};

/**
 *  为用户生成学号
 *
 *  1. 首先获取当前最大学号，构造学号生成函数
 *  2. 查询学员列表
 *  3. 保存生成的学号
 */
pub.syncUserStudentNumber = (userId) => {
  var userObject = {};
  return pub.fetchById(userId)
      .then((userObj) => {
        winston.log('Student:', userObj);
        userObject = userObj;
        return pub.fetchMaxStudentNumber();
      }).then((maxStudentNumber) => {
        return accountUtil.calculateNextStudentNumber(maxStudentNumber);
      }).then((nextStudentNumber) => {
        let studentNumber = nextStudentNumber();
        try {
          wechatCustomMessage.sendCustomMessage(wechatCustomMessage.makeCustomMessage(userObject.openId,
              "TEXT", {content: `亲爱的新笃友，你的学号是${studentNumber}，欢迎加入Uband友班。`}));
        } catch (e) {
        }
        return pub.updateUserItem(userId, {'studentNumber': studentNumber});
      });
};


module.exports = pub;
