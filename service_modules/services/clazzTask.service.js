'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const winston = require('winston');
const debug = require('debug')('service');

const commonError = require('./model/common.error');

const cacheWrapComponent = require('./component/cacheWrap.component');

const userService = require('./user.service');
const materialService = require('./materialLibray.service');

const clazzTaskMapper = require('../dao/mongodb_mapper/clazzTask.mapper');
const clazzTaskReplyMapper = require('../dao/mongodb_mapper/clazzTaskReply.mapper');
const clazzTaskShareMapper = require('../dao/mongodb_mapper/clazzTaskShare.mapper');
const clazzTaskShareClickMapper = require('../dao/mongodb_mapper/clazzTaskShareClick.mapper');
const postMapper = require('../dao/mysql_mapper/post.mapper');

const pub = {};

const REDIS_KEY_PREFIX = `CLAZZ_TASK`;

// 存储班级数据到缓存
const saveUserInCache = (clazzTask) => {
  debug(clazzTask);

  if (_.isNil(clazzTask) || _.isNil(clazzTask._id)) {
    return clazzTask;
  }

  cacheWrapComponent.set(`${REDIS_KEY_PREFIX}_TASK_${clazzTask._id}`, clazzTask);
  return clazzTask;
};

/**
 * 从缓存中获取任务
 * @param taskId
 * @param clazzId
 */
pub.fetchClazzTaskByIdFromCache = (taskId, clazzId) => {
  const fetch = (taskId, clazzId) => pub.fetchClazzTaskById(taskId, clazzId);
  return cacheWrapComponent.wrap(`${REDIS_KEY_PREFIX}_TASK`, fetch, taskId)
      .then(saveUserInCache);
};


/**
 * 根据id获取任务详情
 * @param taskId    任务id
 * @param clazzId   班级id
 * @returns {Task}  任务实例, 包括素材url
 */
pub.fetchClazzTaskById = (taskId, clazzId) => {
  if (_.isNil(taskId)) {
    winston.error('获取课程任务详情失败，参数错误！！！ taskId: %s, clazzId: %s', taskId, clazzId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  let clazzTask;
  return clazzTaskMapper.fetchById(taskId)
      .then((taskItem) => {
        debug(taskItem);
        if (_.isNil(taskItem)) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        clazzTask = taskItem;
        const materialIds = taskItem.materials;
        // 如果素材为空，则直接返回[]
        if (_.isEmpty(materialIds)) {
          return [];
        }
        // 根据id，获取素材列表
        return materialService.queryClazzMaterials(taskItem.clazz, materialIds);
      })
      .then((materialList) => {
        // 设置素材列表
        clazzTask.materials = materialList;

        // 去除无用的字段
        _.each(clazzTask.introductions, (item) => {
          delete item.author;
        });

        return clazzTask;
      });
};


/**
 * 根据任务id获取反馈列表
 * 反馈列表已填充用户信息，且分为两层结构
 * @param taskId    任务id
 * @returns [task]  反馈列表
 */
pub.fetchRepliesByTaskId = (taskId) => {
  // 参数检查
  if (_.isNil(taskId)) {
    winston.error('获取课程任务反馈列表失败，参数错误！！！ taskId: %s', taskId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  let clazzReplies, rootReplies = [];
  return clazzTaskReplyMapper.queryReplyList({clazzTask: taskId})
      .then((replyList) => {
        debug(replyList);

        clazzReplies = replyList;
        // 当回复列表为空的时候，不用继续处理
        if (_.isEmpty(clazzReplies)) {
          return Promise.resolve([]);
        }

        let userIds = [], leafReplies = [], rootRepliesIdMap = {};
        _.each(replyList, (reply) => {
          // 收集userId
          if (!_.isNil(reply.toUserId)) {
            userIds.push(reply.toUserId);
          }
          if (!_.isNil(reply.fromUserId)) {
            userIds.push(reply.fromUserId);
          }

          // 如果没有返回对象，则认为是root反馈
          if (_.isNil(reply.clazzTaskReply)) {
            // 收集root反馈
            rootReplies.push(reply);
            // 初始化root反馈的反馈列表
            reply.replies = [];
            // 放到map中，方便之后的查询
            rootRepliesIdMap[reply.id] = reply;
          } else {
            // 收集leaf反馈
            leafReplies.push(reply);
          }
        });
        debug(userIds);

        // 获取用户信息
        let fetchUserListPromise = userService.queryUser(null, userIds);

        let tempRootReply;
        // 遍历leaf反馈列表，将leaf反馈依次添加到对应的root反馈的replies中
        _.forEach(leafReplies, (leafReply) => {
          tempRootReply = rootRepliesIdMap[leafReply.clazzTaskReply];

          if (tempRootReply) {
            tempRootReply.replies.push(leafReply);
          } else {
            winston.error('添加到任务反馈%s到%s中失败', leafReply.id, tempRootReply.id);
          }
        });

        return fetchUserListPromise;
      })
      .then((userList) => {
        // 将user放入map中
        let userInfoMap = {};
        _.forEach(userList, (userItem) => {
          let userInfoItem = _.pick(userItem, ['id', 'name', 'headImgUrl']);

          userInfoMap[userInfoItem.id] = userInfoItem;
        });

        _.forEach(clazzReplies, (reply) => {
          // 设置用户信息
          reply.userInfo = userInfoMap[reply.fromUserId];
          reply.toUserInfo = userInfoMap[reply.toUserId];

          // 去除引用字段
          delete reply.fromUserId;
          delete reply.toUserId;
          delete reply.clazzTaskReply;
        });

        return rootReplies;
      })
};

/**
 * 回复课程任务
 *
 * @param taskId      任务id
 * @param clazzId     课程id
 * @param replyItem   回复对象
 * @returns {*}
 */
pub.replyClazzTask = (taskId, clazzId, replyItem) => {
  if (_.isNil(taskId) || _.isNil(clazzId) || !_.isPlainObject(replyItem)) {
    winston.error('回复课程任务失败，参数错误！！！\n\ttaskId: %s\n\tclazzId: %s\n\treplyItem: %j', taskId, clazzId, replyItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 1. 检查课程任务是否存在
  return clazzTaskMapper.fetchById(taskId)
      .then((taskItem) => {
        debug(taskItem);
        if (_.isNil(taskItem) || taskItem.clazz !== clazzId) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }
        debug(replyItem);
        // 2. 创建
        return clazzTaskReplyMapper.create(replyItem);
      });
};

/**
 * 课程分享任务记录
 */
pub.createClazzTaskShareLog = (item) => {
  return clazzTaskShareMapper.create(item);
};


/**
 * 查询课程分享记录
 */
pub.queryClazzTaskShareLog = (clazzId, userId) => {
  if (_.isNil(clazzId) || _.isNil(userId)) {
    winston.error('获取了错误的查询参数')
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return clazzTaskShareMapper.queryShares({'clazzId': clazzId, 'userId': userId});
}

/**
 * count某一天的课程分享记录
 */
pub.countDateClazzTaskShareLog = (clazzId, userId, dt) => {
  if (_.isNil(clazzId) || _.isNil(userId) || _.isNil(dt)) {
    winston.error('获取了错误的查询参数')
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  let startDt = (new moment(dt)).startOf('date').toDate();
  let endDt = (new moment(dt)).endOf('date').toDate();
  return clazzTaskShareMapper.countShares({
    'clazzId': clazzId,
    'userId': userId,
    'shareDate': {$gt: startDt, $lt: endDt}
  });
};


/**
 * 记录分享点击
 */
pub.createShareClick = (item) => {
  try {
    return clazzTaskShareClickMapper.create(item);
  } catch (e) {
    console.log('error', e);
  }
};

/**
 * 分页列出班级任务
 *
 * @param clazzId
 * @param pageNumber
 * @param pageSize
 * @param title       查询关键词
 * @returns {*}
 */
pub.listPagedClazzTasks = (clazzId, pageNumber, pageSize, title) => {
  if (_.isNil(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('查询班级任务分页列表失败，参数错误！！！ clazzId: %s, title: %s, pageNumber: %s， pageSize: %s', clazzId, title, pageNumber, pageSize);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  pageNumber = pageNumber || 1;
  pageSize = pageSize || 10;

  let queryParam = {clazz: clazzId};
  if (title && title !== '') {
    queryParam.title = new RegExp(title);
  }

  return clazzTaskMapper.queryPagedClazzTaskList(queryParam, pageNumber, pageSize);
};

/**
 * 查询班级任务列表
 *
 * @param clazzId
 * @returns {*}
 */
pub.listClazzTasks = (clazzId) => {
  if (_.isNil(clazzId)) {
    winston.error('查询班级任务列表失败，参数错误！！！ clazzId: %s', clazzId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzTaskMapper.queryClazzTaskList({clazz: clazzId});
};

/**
 * 新建课程任务
 *
 * @param taskItem
 * @returns {*}
 */
pub.createClazzTask = (taskItem) => {
  if (!_.isPlainObject(taskItem) || !_.isNil(taskItem.id) || _.isNil(taskItem.clazz)) {
    winston.error('创建班级任务失败，参数错误！！！ taskItem: %j', taskItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(taskItem);

  return clazzTaskMapper.create(taskItem);
};

/**
 * 更新课程任务内容
 *
 * @param taskItem
 * @returns {*}
 */
pub.updateClazzTask = (taskItem) => {
  if (!_.isPlainObject(taskItem) || _.isNil(taskItem.id) || _.isNil(taskItem.clazz)) {
    winston.error('更新班级任务失败，参数错误！！！ taskItem: %j', taskItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(taskItem);

  return clazzTaskMapper.update(taskItem.id, taskItem);
};

/**
 * 删除课程任务
 *
 * @param taskId
 * @returns {*}
 */
pub.deleteClazzTask = (taskId) => {
  if (_.isNil(taskId)) {
    winston.error('删除班级任务失败，参数错误！！！ taskId: %j', taskId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(taskId);

  return clazzTaskMapper.destroy(taskId);
};

/**
 * 获取班级最近一次的班级任务详情
 *
 * @param clazzId
 * @returns {Promise|Promise.<*>}
 */
pub.fetchLatestClazzTask = (clazzId) => {
  if (_.isNil(clazzId)) {
    winston.error('获取最近班级任务失败，参数错误！！！ clazzId: %j', clazzId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  postMapper.fetchPostByParams(
      {
        clazzId: clazzId,
        targetDate: {operator: '<=', value: newDate()}
      })
      .then((postItem) => {
        // todo 增加参数校验
        if (_.isNil(postItem)) {
          winston.error('该班级没有可用的推送');
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        return pub.fetchClazzTaskById(postItem.target, clazzId);
      })
};

/**
 * 查询满足条件的所有任务
 *
 * @param clazzIds
 * @returns {*}
 */
pub.queryAllClazzTaskList = (clazzIds) => {
  if (!_.isArray(clazzIds)) {
    winston.error('查询任务列表失败，参数错误！！！ clazzIds: %j', clazzIds);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  if (_.isEmpty(clazzIds)) {
    return Promise.resolve([]);
  }

  return clazzTaskMapper.queryClazzTaskList({_id: clazzIds});
};

module.exports = pub;
