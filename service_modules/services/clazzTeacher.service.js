'use strict';

'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const winston = require('winston');
const debug = require('debug')('service');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const clazzService = require('./clazz.service');
const userService = require('./user.service');

const clazzTeacherMapper = require('../dao/mongodb_mapper/clazzTeacher.mapper');
const clazzTeacherFollowUsersMapper = require('../dao/mysql_mapper/clazzTeacherFollowUsers.mapper');
const meatySharingMapper = require('../dao/mongodb_mapper/meatySharing.mapper');
const clazzTeacherCommendMapper = require('../dao/mongodb_mapper/clazzTeacherCommend.mapper');
const clazzTeacherClazzesMapper = require('../dao/mysql_mapper/clazzTeacherClazzes.mapper');

/**
 * 匹配课程的学员数量
 *
 * @param teacherClazzList
 * @param clazzList
 */
const matchClazzStudentCount = (teacherClazzList, clazzList) => {
  const clazzMap = _.keyBy(teacherClazzList, 'clazzId');
  _.forEach(clazzList, (clazzItem) => {
    clazzItem.studentCount = _.get(clazzMap, [clazzItem.id, 'studentCount'], 0);
  });
};

const pub = {};

/**
 * 查询所有可用笃师
 *
 * @param clazzId
 * @returns {*}
 */
pub.listAllClazzTeachers = () => {
  return clazzTeacherMapper.queryClazzTeacherList({
    isAvailable: true
  });
};

/**
 * 新增笃师
 */
pub.createTeacher = (teacherItem) =>{

  if(!_.isPlainObject(teacherItem)){
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  teacherItem['isAvailable'] = true;
  teacherItem['sortOrder'] = 100;
  teacherItem['introduction'] = '1';
  teacherItem['businessScope'] = '1';
  teacherItem['gender'] = '1';

  return clazzTeacherMapper.create(teacherItem);

};


/**
 * 更新笃师信息
 */
pub.updateClazzTeacher = (teacherId, updateItem) =>{
  if (_.isNil(teacherId) || !_.isPlainObject(updateItem)) {
    winston.error('更新教师参数错误, teacherId: %s, updateItem: %j', teacherId, updateItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherMapper.update(teacherId, updateItem);

};

/**
 * 根据id列表查询笃师列表
 *
 * @param clazzTeacherIds
 * @returns {*}
 */
pub.fetchClazzTeacherListByIds = (clazzTeacherIds) => {
  if (!_.isArray(clazzTeacherIds)) {
    winston.error('获取笃师列表失败，参数错误！！！ clazzTeacherIds: %s', clazzTeacherIds);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  if (_.isEmpty(clazzTeacherIds)) {
    return Promise.resolve([]);
  }

  return clazzTeacherMapper.queryClazzTeacherList({
    _id: clazzTeacherIds,
    isAvailable: true
  });
};

/**
 * 根据id查询笃师
 *
 * @param clazzTeacherId
 * @returns {*}
 */
pub.fetchClazzTeacherById = (clazzTeacherId) => {
  if (_.isNil(clazzTeacherId)) {
    winston.error('获取笃师详情失败，参数错误！！！ clazzTeacherId: %s', clazzTeacherId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherMapper.fetchById(clazzTeacherId);
};

/**
 * 分页获取笃师列表
 *
 * @param pageNumber
 * @param pageSize
 * @returns {*}
 */
pub.fetchPagedClazzTeachers = (pageNumber = 1, pageSize = 10) => {
  if (!_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherMapper.queryPagedClazzTeacherList({}, pageNumber, pageSize);
};

/**
 * 获取笃师的学员关注信息
 *
 * @param clazzTeacherId
 * @param userId
 * @returns {*}
 */
pub.fetchClazzTeacherFollowRelations = (clazzTeacherId, userId) => {
  if (_.isNil(clazzTeacherId) || _.isNil(userId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = {
    clazzTeacherId: clazzTeacherId,
    userId: userId
  };

  debug(queryParam);

  return clazzTeacherFollowUsersMapper.queryAll(queryParam);
};

/**
 * 分页获取笃师分享列表
 *
 * @param idList
 * @param pageNumber
 * @param pageSize
 * @returns {*}
 */
pub.fetchPagedMeatySharings = (idList, pageNumber = 1, pageSize = 10) => {
  if (!_.isArray(idList) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return meatySharingMapper.queryPagedClazzTeacherCommendList({ _id: idList }, pageNumber, pageSize);
};

/**
 * 分页获取笃师评论
 *  -- 匹配学员信息
 *
 * @param clazzTeacherId
 * @param pageNumber
 * @param pageSize
 * @returns {*}
 */
pub.fetchPagedTeacherCommends = (clazzTeacherId, pageNumber = 1, pageSize = 10) => {
  if (_.isNil(clazzTeacherId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherCommendMapper.queryPagedClazzTeacherCommendList(
      { clazzTeacher: clazzTeacherId },
      pageNumber,
      pageSize
      )
      .then((pagedCommend) => {
        const commendList = pagedCommend.values;
        const userIds = _.map(commendList, 'userId');

        return userService.queryUser(null, userIds)
            .then((userList) => {
              const userMap = _.keyBy(userList, 'id');

              _.forEach(commendList, (commendItem) => {
                commendItem.userInfo = userMap[commendItem.userId];
              });

              return pagedCommend;
            })
      });
};

/**
 * 分页获取笃师课程列表
 *
 * @param clazzTeacherId
 * @param pageNumber
 * @param pageSize
 * @returns {Promise|Promise.<*>}
 */
pub.fetchPagedTeacherClazzes = (clazzTeacherId, pageNumber = 1, pageSize = 10) => {
  if (_.isNil(clazzTeacherId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherClazzesMapper.queryAll({ clazzTeacherId: clazzTeacherId })
      .then((teacherClazzList) => {
        debug(teacherClazzList);

        const clazzIdList = _.map(teacherClazzList, 'clazzId');

        return clazzService.queryPagedClazzes(pageNumber, pageSize, null, clazzIdList, enumModel.clazzStatusEnum.OPEN.key)
            .then((pagedClazz) => {
              matchClazzStudentCount(teacherClazzList, pagedClazz.values);

              return pagedClazz;
            });
      });
};

/**
 * 获取笃师所有课程列表
 *
 * @param clazzTeacherId
 * @param clazzStatus
 * @returns {Promise|Promise.<*>}
 */
pub.fetchAllTeacherClazzes = (clazzTeacherId, clazzStatus) => {
  if (_.isNil(clazzTeacherId) || _.isNil(enumModel.getEnumByKey(clazzStatus, enumModel.clazzStatusEnum))) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherClazzesMapper.queryAll({ clazzTeacherId: clazzTeacherId })
      .then((teacherClazzList) => {
        const clazzIdList = _.map(teacherClazzList, 'clazzId');

        debug(clazzIdList);

        return clazzService.queryClazzes(enumModel.clazzStatusEnum.OPEN.key, clazzIdList, null, null)
            .then((clazzList) => {

              matchClazzStudentCount(teacherClazzList, clazzList);

              return clazzList;
            });
      });
};

/**
 * 用户关注笃师
 *
 * @param userId
 * @param clazzTeacherId
 * @returns {*}
 */
pub.userFollowClazzTeacher = (userId, clazzTeacherId) => {
  if (_.isNil(userId) || _.isNil(clazzTeacherId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherFollowUsersMapper.create({
    clazzTeacherId: clazzTeacherId,
    userId: userId,
    followAt: new Date()
  });
};

/**
 * 更新关注人数
 *
 * @param clazzTeacherId
 * @returns {Promise|Promise.<*>}
 */
pub.updateClazzTeacherFollowerCount = (clazzTeacherId) => {
  if (_.isNil(clazzTeacherId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTeacherFollowUsersMapper.queryAll({
        clazzTeacherId: clazzTeacherId
      })
      .then((followList) => {
        debug(followList);

        return clazzTeacherMapper.update(clazzTeacherId, {
          followUserCount: _.size(followList)
        });
      });
};

module.exports = pub;
