'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const openCourseSchema = require('./schema/openCourse.schema');

const enumModel = require('../../services/model/enum');

const openCourseService = require('../../services/openCourse.service');

const pub = {};

/**
 * @typedef {Object} OpenCourseItem
 * @property {String} id - 公开课id
 * @property {String} name - 公开课标题
 * @property {String} author - 公开课作者姓名
 * @property {String} logo - 公开课logo
 * @property {String} status - 公开课状态，参见 enumModel.openCourseStatusEnum
 * @property {Date} openDate - 公开课开始日期
 * @property {Boolean} isSticked - 是否置顶
 */

/**
 * 查询公开课列表，根据状态分组
 *
 * @param req
 * @param res
 * @returns {Promise.<{
 *  PROCESSING: {Object[OpenCourseItem]},
 *  CLOSED: [OpenCourseItem]
 * }>}
 */
pub.queryOpenCourseList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return openCourseService.queryOpenCourseListStatus();
      })
      .then((courseList) => {
        debug(courseList);

        const initResult = _.reduce(
            enumModel.openCourseStatusEnum,
            (statusMap, value, key) => {
              statusMap[key] = [];
              return statusMap;
            },
            {}
        );

        const pickedOpenCourseMap = _.chain(courseList)
            .map((courseItem) => _.pick(
                courseItem,
                ['id', 'name', 'author', 'logo', 'status', 'openDate', 'isSticked']
            ))
            .groupBy('status')
            .value();

        debug(pickedOpenCourseMap);

        return apiRender.renderBaseResult(res, _.extend(initResult, pickedOpenCourseMap));
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取公开课详情
 *
 * @param req
 * @param res
 * @returns {Promise.<T>}
 */
pub.fetchOpenCourseItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const pickedOpenCourseItem = _.pick(
            req.__CURRENT_OPEN_COURSE_ITEM,
            ['id', 'name', 'author', 'description', 'banner', 'openDate', 'isSticked', 'tagList']
        );

        pickedOpenCourseItem.isJoined = req.__IS_USER_JOIN_OPEN_COURSE;

        return apiRender.renderBaseResult(res, pickedOpenCourseItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 学员加入公开课
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.addUserToOpenCourse = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        if (req.__IS_USER_JOIN_OPEN_COURSE) {
          return Promise.resolve(true);
        }

        return openCourseService.addUserToOpenCourse(req.__CURRENT_OPEN_COURSE_ITEM, req.__CURRENT_USER);
      })
      .then((addResult) => {
        debug(addResult);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取公开课环信信息，用于用户登录及获取群组消息
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchOpenCourseEasemobInfo = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const openCourseItem = req.__CURRENT_OPEN_COURSE_ITEM;

        const teacherUserIdList = _.get(openCourseItem, 'teacherUserIdList', []);
        const courseGroupId = _.get(openCourseItem, ['courseGroup', 'groupid'], null);
        const discussGroupId = _.get(openCourseItem, ['discussGroup', 'groupid'], null);

        const easemobUserInfo = _.pick(req.__CURRENT_USER_BIND_ITEM, ['accountName', 'password']);

        return apiRender.renderBaseResult(res,
            {
              isTeacher: _.includes(teacherUserIdList, req.__CURRENT_USER.id),  // 是否为 课程笃师
              groupInfo: {                                                      // 课程群组信息
                courseGroupId: courseGroupId,                                   // 课程直播群组id
                discussGroupId: discussGroupId,                                 // 课程讨论群组id
              },
              easemobUserInfo: easemobUserInfo                                  // 用户环信信息
            }
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取公开课群组成员列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchOpenCourseMembers = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return openCourseService.fetchAllMembers(req.__CURRENT_OPEN_COURSE_ITEM);
      })
      .then((memberList) => {
        debug(memberList);

        const userIdMap = _.chain(memberList)
            .map((userItem) => _.pick(userItem, ['id', 'name', 'headImgUrl']))
            .keyBy('id')
            .value();

        return apiRender.renderBaseResult(res, userIdMap);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
