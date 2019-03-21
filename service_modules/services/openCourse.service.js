'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const Promise = require('bluebird');
const winston = require('winston');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const userService = require('./user.service');

const easemobComponent = require('./component/easemob.component');

const openCourseMapper = require('../dao/mongodb_mapper/openCourse.mapper');
const userOpenCourseRelationMapper = require('../dao/mysql_mapper/userOpenCourseRelation.mapper');

/**
 * 添加公开课群组
 *
 * @param courseGroup
 * @returns {Promise.<TResult>|Promise}
 */
const addGroupMembers = (courseGroup) => {
  const joinOpenCoursePromiseList = _.map(
      groupMembers,
      (memberId) => {
        return userOpenCourseRelationMapper.create({
          userId: memberId,
          openCourseId: courseGroup.groupid,
          status: enumModel.userOpenCourseRelationStatusEnum.PROCESSING.key
        })
      });

  return Promise.all(joinOpenCoursePromiseList).then(() => courseGroup);
};

const pub = {};

/**
 * 新建公开课条目
 *
 * @param courseItem
 */
pub.createOpenCourseItem = (courseItem) => {
  if (!_.isPlainObject(courseItem) && !_.isNil(courseItem.id)) {
    winston.error('新建公开课失败，参数错误！！！courseItem: %j', courseItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(courseItem);

  return openCourseMapper.create(courseItem)
      .then((openCourseItem) => {
        debug(openCourseItem);

        const openCourseId = openCourseItem.id,
            openCourseName = courseItem.name,
            openCourseDesc = courseItem.description,
            groupMembers = courseItem.teacherUserIdList;

        return easemobComponent.hashPasswordPromise(openCourseId)
            .then((password) => {
              const groupOwner = {
                username: openCourseId,
                password: password,
                nickname: openCourseName
              };

              return easemobComponent.registerEasemobUserList([groupOwner])
                  .then((groupOwnerList) => {
                    const groupOwner = groupOwnerList[0];
                    const ownerUsername = groupOwner.username;

                    const courseGroup = {
                          groupname: `${ openCourseId }讲座区`,
                          desc: openCourseDesc,
                          owner: ownerUsername,
                          members: groupMembers
                        },
                        discussGroup = {
                          groupname: `${ openCourseId }讨论区`,
                          desc: openCourseDesc,
                          owner: ownerUsername,
                          members: groupMembers
                        };

                    const createCourseGroupPromise = easemobComponent.createEasemobGroup(courseGroup).then(addGroupMembers),
                        createDiscussGroupPromise = easemobComponent.createEasemobGroup(discussGroup).then(addGroupMembers);

                    return Promise.all([createCourseGroupPromise, createDiscussGroupPromise]);
                  })
                  .then((groupList) => {
                    debug(groupList);

                    const courseGroup = groupList[0],
                        discussGroup = groupList[1];

                    return openCourseMapper.update(
                        openCourseId,
                        {
                          courseGroup: courseGroup,
                          discussGroup: discussGroup,
                          groupOwner: {
                            username: groupOwner.username,
                            password: groupOwner.password,
                          }
                        }
                    );
                  });
            });
      })
};

/**
 * 获取所有公开课
 *
 * @returns {Promise.<TResult>}
 */
pub.queryOpenCourseListStatus = () => {
  return openCourseMapper.queryAll({});
};

/**
 * 根据id获取公开课详情
 *
 * @param openCourseId
 * @returns {Promise.<TResult>}
 */
pub.fetchOpenCourseItemById = (openCourseId) => {
  return openCourseMapper.fetchById(openCourseId);
};

/**
 * 将用户加入公开课
 *
 * @param openCourseItem
 * @param userItem
 * @returns {Promise.<TResult>|Promise}
 */
pub.addUserToOpenCourse = (openCourseItem, userItem) => {
  const courseGroupId = openCourseItem.courseGroup.groupid,
      discussGroupId = openCourseItem.discussGroup.groupid,
      easemobUsername = userItem.id;

  const addCourseGroup = easemobComponent.addEasemobGroupUser(courseGroupId, easemobUsername),
      addDiscussGroup = easemobComponent.addEasemobGroupUser(discussGroupId, easemobUsername);

  return Promise.all([addCourseGroup, addDiscussGroup])
      .then((results) => {
        debug(results);

        return userOpenCourseRelationMapper.create({
          userId: userItem.id,
          openCourseId: openCourseItem.id,
          status: enumModel.userOpenCourseRelationStatusEnum.PROCESSING.key
        });
      });
};

/**
 * 获取用户公开课关系
 *
 * @param openCourseItem
 * @param userItem
 * @returns {*}
 */
pub.fetchUserOpenCourseRelationItem = (openCourseItem, userItem) => {
  return userOpenCourseRelationMapper.fetchByParam({
    openCourseId: openCourseItem.id,
    userId: userItem.id
  });
};

/**
 * 获取所有公开课成员
 *
 * @param openCourseItem
 */
pub.fetchAllMembers = (openCourseItem) => {
  return userOpenCourseRelationMapper.queryAll({
        openCourseId: openCourseItem.id
      })
      .then((relationList) => {
        debug(relationList);

        const userIdList = _.map(relationList, 'userId');

        return userService.queryUser(null, userIdList);
      });
};

module.exports = pub;
