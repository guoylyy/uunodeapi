'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const winston = require('winston');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const teacherSchema = require('./schema/clazzTeacher.schema');

const apiUtil = require('../util/api.util');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const clazzTeacherService = require('../../services/clazzTeacher.service');

const pickClazzInfo = (clazzItem) => {
  const pickedClazzItem = apiUtil.pickClazzBasicInfo(clazzItem);

  pickedClazzItem.studentCount = _.get(clazzItem, 'studentCount', 0);

  return pickedClazzItem;
};


const TEACHER_BACKGROUND_LIST = ['http://qiniuprivate.gambition.cn/PU8Yzb_tc-bg-08.png',
  'http://qiniuprivate.gambition.cn/4Ka83M_tc-bg-07.png',
  'http://qiniuprivate.gambition.cn/EcA95H_tc-bg-06.png',
  'http://qiniuprivate.gambition.cn/nUHhfV_tc-bg-05.png',
  'http://qiniuprivate.gambition.cn/ttuCh8_tc-bg-04.png',
  'http://qiniuprivate.gambition.cn/yn4q0a_tc-bg-03.png',
  'http://qiniuprivate.gambition.cn/awT58Y_tc-bg-02.png',
  'http://qiniuprivate.gambition.cn/vmN6RJ_tc-bg-01.png'];

/**
 * 分页获取笃师课程列表， 已去除开课中的课程
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
const fetchPagedTeacherClazzList = (req, res) => {
  return schemaValidator.validatePromise(teacherSchema.pagedTeacherClazzListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzTeacherService.fetchPagedTeacherClazzes(
            req.__CURRENT_CLAZZ_TEACHER_ITEM.id,
            queryParam.pageNumber,
            queryParam.pageSize
        );
      })
      .then((pagedClazz) => {
        debug(pagedClazz);

        const pickedClazzList = _.map(pagedClazz.values, pickClazzInfo);

        return apiRender.renderPageResult(
            res,
            pickedClazzList,
            pagedClazz.itemSize,
            pagedClazz.pageSize,
            pagedClazz.pageNumber
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取笃师开课中的课程列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
const fetchClazzTeacherOpenClazzList = (req, res) => {
  return schemaValidator.validatePromise(teacherSchema.teacherClazzListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);


        return clazzTeacherService.fetchAllTeacherClazzes(req.__CURRENT_CLAZZ_TEACHER_ITEM.id, queryParam.status);
      })
      .then((clazzList) => {
        const pickedClazzList = _.map(clazzList, pickClazzInfo);

        return apiRender.renderBaseResult(res, pickedClazzList);
      })
      .catch(req.__ERROR_HANDLER);
};

const pub = {};

/**
 * 分页获取笃师列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchPagedTeacherList = (req, res) => {
  return schemaValidator.validatePromise(teacherSchema.teacherListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzTeacherService.fetchPagedClazzTeachers(queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedTeacher) => {

        const pickedTeacherList = _.map(
            pagedTeacher.values,
            (teacherItem) => _.pick(
                teacherItem,
                ['id', 'name', 'headImgUrl', 'description', 'followUserCount', 'clazzStudentCount', 'gender', 'tags']
            )
        );

        return apiRender.renderPageResult(
            res,
            pickedTeacherList,
            pagedTeacher.itemSize,
            pagedTeacher.pageSize,
            pagedTeacher.pageNumber
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取笃师详情
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchTeacherItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        const currentTeacherId = req.__CURRENT_CLAZZ_TEACHER_ITEM.id;

        const fetchFollowRelationPromise = clazzTeacherService.fetchClazzTeacherFollowRelations(
            currentTeacherId,
            req.__CURRENT_USER.id
        );

        const fetchOpenClazzesPromise = clazzTeacherService.fetchAllTeacherClazzes(
            currentTeacherId,
            enumModel.clazzStatusEnum.OPEN.key
        );

        return Promise.all([fetchFollowRelationPromise, fetchOpenClazzesPromise]);
      })
      .then((result) => {
        const followUserList = result[0],
            openClazzList = result[1];

        debug(followUserList);
        debug(openClazzList);

        const pickedTeacherItem = _.pick(
            req.__CURRENT_CLAZZ_TEACHER_ITEM,
            ['id', 'name', 'headImgUrl', 'description', 'followUserCount', 'clazzStudentCount', 'introduction']
        );

        // 当前用户是否关注笃师
        pickedTeacherItem.isCurrentUserFollowed = !_.isEmpty(followUserList);
        // 设置笃师开课中的课程数量
        pickedTeacherItem.openClazzCount = _.size(openClazzList);
        // 随机设置背景图
        pickedTeacherItem.backgroundUrl = _.sample(TEACHER_BACKGROUND_LIST);

        return apiRender.renderBaseResult(res, pickedTeacherItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 分页获取笃师分享列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchPagedTeacherMeatySharingList = (req, res) => {
  return schemaValidator.validatePromise(teacherSchema.teacherListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        // 获取笃师分享条目
        const meatySharingIdList = _.get(req.__CURRENT_CLAZZ_TEACHER_ITEM, 'meatySharingList', []);
        return clazzTeacherService.fetchPagedMeatySharings(meatySharingIdList, queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedMeatySharing) => {
        debug(pagedMeatySharing);

        const pickedMeatySharingList = _.map(
            pagedMeatySharing.values,
            (item) => _.pick(item, ['id', 'name', 'url'])
        );

        return apiRender.renderPageResult(
            res,
            pickedMeatySharingList,
            pagedMeatySharing.itemSize,
            pagedMeatySharing.pageSize,
            pagedMeatySharing.pageNumber
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 分页获取笃师评论列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchPagedTeacherCommendList = (req, res) => {
  return schemaValidator.validatePromise(teacherSchema.teacherCommendListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzTeacherService.fetchPagedTeacherCommends(
            req.__CURRENT_CLAZZ_TEACHER_ITEM.id,
            queryParam.pageNumber,
            queryParam.pageSize
        );
      })
      .then((pagedCommend) => {
        debug(pagedCommend);

        const pickedMeatySharingList = _.map(pagedCommend.values, (commendItem) => {
          const pickedCommendItem = _.pick(commendItem, ['id', 'clazzName', 'commend']);

          pickedCommendItem.userInfo = apiUtil.pickUserBasicInfo(commendItem.userInfo);

          return pickedCommendItem;
        });

        return apiRender.renderPageResult(
            res,
            pickedMeatySharingList,
            pagedCommend.itemSize,
            pagedCommend.pageSize,
            pagedCommend.pageNumber
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取笃师的课程列表
 * 1. 分页获取
 * 2. 获取开的课程列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchClazzTeacherClazzList = (req, res) => {
  const status = req.query.status;

  if (_.isNil(status)) {
    return fetchPagedTeacherClazzList(req, res);
  }

  return fetchClazzTeacherOpenClazzList(req, res);
};

/**
 * 关注笃师
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.followClazzTeacher = (req, res) => {
  const currentTeacherId = req.__CURRENT_CLAZZ_TEACHER_ITEM.id,
      currentUserId = req.__CURRENT_USER.id;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((requestBody) => {
        debug(requestBody);

        return clazzTeacherService.fetchClazzTeacherFollowRelations(currentTeacherId, currentUserId);
      })
      .then((relationList) => {
        debug(relationList);

        if (!_.isEmpty(relationList)) {
          return Promise.reject(commonError.PARAMETER_ERROR('已关注笃师'));
        }

        return clazzTeacherService.userFollowClazzTeacher(currentUserId, currentTeacherId);
      })
      .then((followResult) => {
        debug(followResult);

        // 更新关注人数
        clazzTeacherService.updateClazzTeacherFollowerCount(currentTeacherId);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
