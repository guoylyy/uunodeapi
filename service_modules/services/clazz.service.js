'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const cacheWrapper = require('./component/cacheWrap.component');

const clazzMapper = require('../dao/mongodb_mapper/clazz.mapper');
const clazzIntroductionMapper = require('../dao/mongodb_mapper/clazzIntroduction.mapper');
const clazzNotificationMapper = require('../dao/mongodb_mapper/clazzNotification.mapper');

// clazz 缓存 前缀
const CLAZZ_PREFIX_KEY = `CLAZZ`;

/**
 * 在缓存中存储clazzItem
 *
 * @param clazzItem
 */
const saveClazzInCache = (clazzItem) => {
  if (_.isNil(clazzItem)) {
    return null;
  }

  cacheWrapper.set(`${ CLAZZ_PREFIX_KEY }_ID_${ clazzItem.id }`, clazzItem);
};

// clazzIntroduction 缓存 前缀
const CLAZZ_INTRODUCTION_PREFIX_KEY = `CLAZZ_INTRODUCTION`;

/**
 * 在缓存中存储clazzIntroductionItem
 *
 * @param clazzIntroductionItem
 */
const saveClazzIntroductionInCache = (clazzIntroductionItem) => {
  if (_.isNil(clazzIntroductionItem)) {
    return null;
  }

  cacheWrapper.set(`${ CLAZZ_INTRODUCTION_PREFIX_KEY }_ID_${ clazzIntroductionItem.id }`, clazzIntroductionItem);
};

const pub = {};

/**
 * 根据status分页获取课程列表
 * @param status          班级状态
 * @param clazzIdList     班级id列表
 * @param teacherOpenId   笃师openId
 * @param clazzType       班级类型
 * @param clazzName       班级名
 *
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.queryClazzes = (status, clazzIdList, teacherOpenId, clazzType, clazzName) => {
  debug(status);
  debug(clazzIdList);
  debug(teacherOpenId);

  if (!_.isString(status) && !_.isArray(clazzIdList) && !_.isString(teacherOpenId) && !_.isString(clazzType)) {
    winston.error(
        '查询课程列表失败，参数错误！status: %s, clazzIdList: %j, teacherOpenId: %s, clazzType: %s',
        status,
        clazzIdList,
        teacherOpenId,
        clazzType
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = {};

  if (_.isArray(clazzIdList)) {
    if (_.isEmpty(clazzIdList)) {
      return Promise.resolve([]);
    }

    queryParam['_id'] = clazzIdList;
  }

  if (status) {
    queryParam['status'] = status;
  }
  if (teacherOpenId) {
    queryParam['configuration.teacherOpenIds'] = teacherOpenId;
  }
  if (_.isArray(clazzType) || !_.isNil(enumModel.getEnumByKey(clazzType, enumModel.clazzTypeEnum))) {
    queryParam['clazzType'] = clazzType;
  }
  // 检查并设置课程名
  if (_.isString(clazzName)) {
    queryParam['name'] = { $regex: `.*${clazzName}.*` };
  }

  return clazzMapper.query(queryParam);
};

/**
 * 根据clazzId获取clazz对象
 * @param clazzId
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.fetchClazzById = (clazzId) => {
  if (_.isNil(clazzId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const fetchClazzById = clazzMapper.fetchById;

  return cacheWrapper.wrap(`${ CLAZZ_PREFIX_KEY }_ID`, fetchClazzById, clazzId);
};

/**
 * 根据introductionId获取introduction对象
 * @param introductionId
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.fetchIntroductionById = (introductionId) => {
  if (_.isNil(introductionId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const fetchIntroductionById = clazzIntroductionMapper.fetchById;

  return cacheWrapper.wrap(`${ CLAZZ_INTRODUCTION_PREFIX_KEY }_ID`, fetchIntroductionById, introductionId);
};

/**
 * 分页查询课程列表
 *
 * @param pageNumber
 * @param pageSize
 * @param status
 * @param idList
 * @param excludeStatus
 * @param clazzName
 * @returns {*}
 */
pub.queryPagedClazzes = (pageNumber = 1, pageSize = 10, status, idList, excludeStatus, clazzName) => {
  const parameterErrorHandler = () => {
    winston.error(
        '分页查询班级列表参数错误, pageNumber: %s, pageSize: %s, status: %s, idList: %j, excludeStatus: %s, clazzName: %s',
        pageNumber,
        pageSize,
        status,
        idList,
        excludeStatus,
        clazzName
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  };

  // 查询参数
  const queryParam = {};

  // 处理状态
  if (!_.isNil(status)) {
    if (_.isNil(enumModel.getEnumByKey(status, enumModel.clazzStatusEnum))) {
      return parameterErrorHandler();
    }

    queryParam.status = status;
  }

  // 处理id列表
  if (_.isArray(idList)) {
    if (_.isEmpty(idList)) {
      return Promise.resolve([]);
    }

    queryParam._id = idList;
  }

  // 处理排除掉的状态
  if (!_.isNil(excludeStatus)) {
    if (_.isNil(enumModel.getEnumByKey(excludeStatus, enumModel.clazzStatusEnum))) {
      return parameterErrorHandler();
    }

    queryParam.status = { $ne: excludeStatus };
  }

  // 检查并设置课程名
  if (!_.isNil(clazzName)) {
    if (_.isString(clazzName)) {
      queryParam.name = { $regex: `.*${clazzName}.*` };
    } else {
      return parameterErrorHandler();
    }
  }

  return clazzMapper.queryPageClazzList(queryParam, pageNumber, pageSize);
};

/**
 * 新建班级
 *
 * @param clazzItem
 * @returns {*}
 */
pub.createClazzItem = (clazzItem) => {
  debug(clazzItem);

  if (!_.isPlainObject(clazzItem) || !_.isNil(clazzItem.id)) {
    winston.error('新建班级参数错误, clazzItem: %j', clazzItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzIntroductionMapper.create(
      {
        title: clazzItem.name,
        introduction: null,
        strategy: null
      })
      .then((clazzIntroductionItem) => {
        debug(clazzIntroductionItem);

        saveClazzIntroductionInCache(clazzIntroductionItem);

        clazzItem.introduction = clazzIntroductionItem.id;

        return clazzMapper.create(clazzItem);
      })
      .then((clazzItem) => {
        debug(clazzItem);

        saveClazzInCache(clazzItem);

        return clazzItem;
      })
};

/**
 * 更新班级
 *
 * @param clazzId
 * @param clazzItem
 * @returns {*}
 */
pub.updateClazzItem = (clazzId, clazzItem) => {
  debug(clazzId);
  debug(clazzItem);

  if (_.isNil(clazzId) || !_.isPlainObject(clazzItem)) {
    winston.error('更新班级参数错误, clazzId: %s, clazzItem: %j', clazzId, clazzItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzMapper.updateById(clazzId, clazzItem)
      .then((updatedClazzItem) => {
        saveClazzInCache(updatedClazzItem);

        return updatedClazzItem;
      });
};

/**
 * 更新班级简介
 *
 * @param introductionId
 * @param introductionItem
 * @returns {Promise.<*>}
 */
pub.updateClazzIntroduction = (introductionId, introductionItem) => {
  debug(introductionId);
  debug(introductionItem);

  if (_.isNil(introductionId) || !_.isPlainObject(introductionItem)) {
    winston.error('更新班级简介参数错误, introductionId: %s, introductionItem: %j', introductionId, introductionItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzIntroductionMapper.updateById(introductionId, introductionItem)
      .then((updateIntroductionItem) => {
        saveClazzIntroductionInCache(updateIntroductionItem);

        return updateIntroductionItem;
      });
};

/**
 * 新建按班级推送记录
 *
 * @param clazzId
 * @param status
 * @param title
 * @param remark
 * @param url
 * @param success
 * @param fail
 * @returns {Promise|Promise.<*>}
 */
pub.createClazzNotification = (clazzId, status, title, remark, url, success, fail) => {
  if (_.isNil(clazzId) ||
      !_.isString(status) || !_.isString(title) || !_.isString(remark) || !_.isString(url) ||
      !_.isSafeInteger(success) || !_.isSafeInteger(fail)) {
    winston.error(
        '创建班级推送记录失败，参数错误！！！clazzId: %s, status: %s, title: %s, remark: %s, url: %s, success: %s, fail: %s',
        clazzId,
        status,
        title,
        remark,
        url,
        success,
        fail
    );

    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzNotificationMapper.create({
    clazz: clazzId,
    clazzJoinStatus: status,
    title: title,
    remark: remark,
    url: url,
    success: success,
    fail: fail,
    pushAt: new Date()
  });
};

pub.queryPagedClazzNotificationList = (clazzId, pageNumber, pageSize) => {
  if (_.isNil(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('分页查询班级推送记录失败，参数错误！！！clazzId: %s, pageNumber: %s, pageSize: %s', clazzId, pageNumber, pageSize);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzNotificationMapper.pagedQuery(
      {
        clazz: clazzId
      },
      pageNumber,
      pageSize
  );
};

pub.fetchClazzNotificationById = (notificationId) => {
  if (_.isNil(notificationId)) {
    winston.error('根据id获取班级推送记录失败，参数错误！！！notificationId: %s', notificationId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzNotificationMapper.fetchById(notificationId);
};

/**
 * 查询所有进行中的班级
 * 即 开班日期小于或等于当前日期，结班日期大于或等于当前日期
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.queryAllProcessingClazzList = () => {
  const now = new Date();

  return clazzMapper.query({
    startDate: { $lte: now },
    endDate: { $gte: now }
  });
};

module.exports = pub;
