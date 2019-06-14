'use strict';

const _ = require('lodash');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const enumModel = require('./model/enum');
const commonError = require('./model/common.error');

const clazzUtil = require('./util/clazz.util');

const clazzAccountMapper = require('../dao/mysql_mapper/clazzAccount.mapper');
const clazzTaskMapper = require('../dao/mongodb_mapper/clazzTask.mapper');
const clazzAccountRecordMapper = require('../dao/mysql_mapper/clazzAccountRecord.mapper');

const postMapper = require('../dao/mysql_mapper/post.mapper');

const pub = {};

/**
 * 列出学员课程任务
 *
 * @param clazzItem         clazz对象，至少有id, startDate, clazzType
 * @param clazzAccountItem  clazzAccount对象, 至少有userId, joinDate
 * @returns [TaskItem]      任务列表（标记是否已打卡，format日期）
 */
pub.fetchUserClazzPostList = (clazzItem, clazzAccountItem) => {
  // 参数检查
  if (!_.isPlainObject(clazzItem) || !_.isPlainObject(clazzAccountItem) || clazzAccountItem.clazzId !== clazzItem.id) {
    winston.error('获取课程任务列表失败，参数错误！！！clazz: %j, clazzAccount: %j。', clazzItem, clazzAccountItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const clazzId = clazzItem.id,
      clazzStartDate = clazzItem.startDate,
      clazzType = clazzItem.clazzType,
      userId = clazzAccountItem.userId,
      userJoinDate = clazzAccountItem.joinDate;

  // 参数检查
  if (_.isNil(clazzId) || !_.isDate(clazzStartDate) || !_.isString(clazzType) || _.isNil(userId) || !_.isDate(userJoinDate)) {
    winston.error(
        '获取课程任务列表失败，参数错误！！！ clazzId: %s, clazzStartDate: %s, clazzType: %s, userId: %s, userJoinDate: %s。',
        clazzId,
        clazzStartDate,
        clazzType,
        userId,
        userJoinDate
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const nowMoment = moment();

  const queryAllClazzPostListPromise = postMapper.queryAllPosts(
      {
        clazzId: clazzId,
        targetDate: { operator: '<=', value: nowMoment.toDate() }
      }),
      queryClazzAccountRecordListPromise = (clazzType === enumModel.clazzTypeEnum.LONG_TERM.key)
          ? clazzAccountRecordMapper.queryClazzAccountRecordList({ clazzAccountId: clazzAccountItem.id })
          : Promise.resolve([{ startDate: null, endDate: null }]);

  return Promise.all([queryAllClazzPostListPromise, queryClazzAccountRecordListPromise])
      .then((results) => {
        const postList = results[0],
            clazzAccountRecordList = results[1];
        debug(postList);

        const stickiedGroupedPostMap = _.groupBy(postList, 'stickied');
        debug(stickiedGroupedPostMap);

        const unStickiedPostList = _.filter(stickiedGroupedPostMap[false], (postItem) => clazzUtil.checkDateIsWithinClazzRange(postItem.targetDate, clazzAccountRecordList));

        return _.map(_.flatten([_.get(stickiedGroupedPostMap, true, []), unStickiedPostList]));
      });
};

/**
 * 获取用户当天的任务列表
 *
 * @param userId
 */
pub.fetchUserTodayPostList = (userId) => {

  // 1. 获取userId用户加入的所有处于status状态的clazzAccount
  return clazzAccountMapper.queryClazzAccounts(
      {
        userId: userId,
        status: [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key]
      })
      .then((clazzAccountList) => {
        debug(clazzAccountList);

        const nowMoment = moment();
        // 2. 获取clazz id列表
        const clazzIds = _.map(clazzAccountList, 'clazzId'),
            todayStartDate = nowMoment.startOf('day').format('YYYY-MM-DD HH:mm:ss'),
            todayEndDate = nowMoment.endOf('day').format('YYYY-MM-DD HH:mm:ss');

        return postMapper.queryAllPosts(
            {
              clazzId: clazzIds,
              targetDate: { operator: 'between', value: [todayStartDate, todayEndDate] }
            });
      });
};

/**
 * 获取所有待发送的推送任务
 *
 * @returns {Promise.<TResult>|Promise}
 */
pub.listAllAvailablePosts = (startDate, endDate) => {
  const startMoment = moment(startDate);

  if (startMoment.isAfter(endDate)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(startMoment);
  debug(endDate);

  return postMapper.queryAllPosts({
    status: enumModel.postStatusEnum.WAITING.key,
    targetDate: {
      operator: 'between',
      value: [startMoment.format('YYYY-MM-DD HH:mm:ss'), moment(endDate).format('YYYY-MM-DD HH:mm:ss')]
    }
  })
};

/**
 * 分页查询班级推送任务
 *
 * @param clazzId
 * @param pageNumber
 * @param pageSize
 * @param keyword
 * @returns {*}
 */
pub.listPagedPosts = (clazzId, pageNumber, pageSize, keyword) => {
  if (_.isNil(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('查询班级推送任务分页列表失败，参数错误！！！ clazzId: %s, keyword: %s, pageNumber: %s， pageSize: %s', clazzId, keyword, pageNumber, pageSize);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  pageNumber = pageNumber || 1;
  pageSize = pageSize || 10;

  let queryParam = { clazzId: clazzId };
  if (keyword && keyword !== '') {
    queryParam.keyword = keyword;
  }

  return postMapper.queryPagePosts(queryParam, pageSize, pageNumber);
};

/**
 * 根据id，获取推送任务
 * @param postId
 * @param clazzId
 * @returns {Promise|Promise.<*>}
 */
pub.fetchClazzPostById = (postId, clazzId) => {
  if (_.isNil(postId) || _.isNil(clazzId)) {
    winston.error('获取推送任务失败，参数错误！！！postId: %s, clazzId: %s', postId, clazzId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return postMapper.fetchPostByParams({
    id: postId,
    clazzId: clazzId
  });
};

/**
 * 标记推送任务为已发送
 *
 * @param postItem
 * @returns {Promise|Promise.<*>}
 */
pub.updateClazzPost = (postItem) => {
  if (!_.isPlainObject(postItem) || _.isNil(postItem.id)) {
    winston.error('标记推送任务为失败，参数错误！！！postItem: %j', postItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  postMapper.update(postItem);
};

/**
 * 从班级推送中新建推送任务
 *
 * @param clazzId
 * @param postItem
 * @returns {*}
 */
pub.createFromClazzTask = (clazzId, postItem) => {
  if (_.isNil(clazzId) || !_.isPlainObject(postItem) || !_.isNil(postItem.id)) {
    winston.error('新建推送任务失败，参数错误！！！ clazzId: %s, postItem: %j', clazzId, postItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTaskMapper.fetchById(postItem.taskId)
      .then((taskItem) => {
        if (_.isNil(taskItem) || taskItem.clazz !== clazzId) {
          return Promise.reject(commonError.PARAMETER_ERROR('不存在的班级任务！'));
        }

        return postMapper.create({
          clazzId: clazzId,
          title: postItem.title,
          status: enumModel.postStatusEnum.WAITING.key,
          postType: enumModel.postTypeEnum.CLAZZ_TASK.key,
          targetDate: postItem.targetDate,
          target: postItem.taskId,
          stickied: postItem.stickied
        });
      });
};

/**
 * 删除推送任务
 *
 * @param clazzId
 * @param postId
 * @returns {*}
 */
pub.deleteClazzPost = (clazzId, postId) => {
  if (_.isNil(clazzId) || _.isNil(postId)) {
    winston.error('更新推送任务失败，参数错误！！！ clazzId: %s, postId: %j', clazzId, postId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(clazzId);
  debug(postId);

  return postMapper.fetchPostByParams(
      {
        id: postId,
        clazzId: clazzId
      })
      .then((post) => {
        if (_.isNil(post)) {
          return Promise.reject(commonError.PARAMETER_ERROR('不存在的推送任务！'));
        }

        debug(post);

        return postMapper.destroy(postId);
      })
};

module.exports = pub;
