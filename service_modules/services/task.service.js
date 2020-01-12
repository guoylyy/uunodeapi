"use strict";

const _ = require("lodash");
const winston = require("winston");
const Promise = require("bluebird");
const debug = require("debug")("service");
const taskMapper = require("../dao/mongodb_mapper/task.mapper");
const taskCheckinMapper = require("../dao/mongodb_mapper/taskCheckin.mapper");
const pushTaskMapper = require("../dao/mongodb_mapper/pushTask.mapper");
const attachMapper = require("../dao/mongodb_mapper/attach.mapper");
const commonError = require("./model/common.error");
const qiniuComponent = require("./component/qiniu.component");

const pub = {};

/**
 * 分页查询课程列表
 */
pub.queryTaskList = queryParam => {
  return taskMapper.queryPagedTaskList(
    queryParam,
    queryParam.pageNumber,
    queryParam.pageSize
  );
};

/**
 * 获取任务详情
 */
pub.fetchById = taskId => {
  if (_.isNil(taskId)) {
    winston.error("获取任务详情失败，参数错误！！！ taskId: %s", taskId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return taskMapper.findById(taskId).then(task => {
    if (_.isNil(task)) {
      winston.error("获取任务详情失败，参数错误！！！ taskId: %s", taskId);
      return Promise.reject(commonError.NOT_FOUND_ERROR("task不存在"));
    }
    return Promise.all([
      attachMapper.fetchById(task.srcAudio),
      attachMapper.fetchById(task.srcVideo),
      attachMapper.fetchById(task.oppoAudio),
      attachMapper.fetchById(task.oppoVideo)
    ]).then(([srcAudioAttach, srcVideoAttach, oppoAudioAttach, oppoVideoAttach]) => {
      if (!_.isNil(srcAudioAttach)) {
        srcAudioAttach.url = qiniuComponent.getAccessibleUrl(srcAudioAttach.attachType, srcAudioAttach.key);
        task.srcAudio = srcAudioAttach;
      }
      if (!_.isNil(srcVideoAttach)){
        srcVideoAttach.url = qiniuComponent.getAccessibleUrl(srcVideoAttach.attachType, srcVideoAttach.key);
        task.srcVideo = srcVideoAttach
      }
      if (!_.isNil(oppoAudioAttach)){
        oppoAudioAttach.url = qiniuComponent.getAccessibleUrl(oppoAudioAttach.attachType, oppoAudioAttach.key);
        task.oppoAudio = oppoAudioAttach
      }
      if (!_.isNil(oppoVideoAttach)){
        srcVideoAttach.url = qiniuComponent.getAccessibleUrl(oppoVideoAttach.attachType, oppoVideoAttach.key);
        task.oppoVideo = oppoVideoAttach
      }
      return task;
    });
  });
};

/**
 * 获取当日任务
 */
pub.fetchTodayTask = () => {
  const currentDate = new Intl.DateTimeFormat('en-US').format(new Date());
  let param = {pushAt: currentDate};
  return pushTaskMapper.findByParam(param)
  .then(pushTask => {
    // task对象 打卡数量 打卡人员列表 promise all
    if (!_.isNil(pushTask)) {
      return Promise.all([pub.fetchById(pushTask.taskId), taskCheckinMapper.countByParam({taskId: pushTask.taskId}), taskCheckinMapper.queryCheckinList({taskId: pushTask.taskId})])
      .then(([task, checkinCount, pagedCheckin]) => {
        task.checkinCount = checkinCount;
        // console.log(_.map(pagedCheckin, "userId"));
        return task;
      })
    } 
    return null;
  })
};

/**
 * 打卡
 */
pub.checkin = (taskCheckin) => {
  taskMapper.findById(taskCheckin.taskId)
  .then((task) => {
    taskCheckin.task = task;
    return taskCheckinMapper.checkin(taskCheckin);
  });
}

/**
 * 获取打卡列表
 */
pub.getCheckinList = (queryParam) => {
  return taskCheckinMapper.queryCheckinList(queryParam)
  .then(checkinList => {
    const queryAttach = [];
    for (let i=0; i<checkinList.length; i++) {
      queryAttach.push(attachMapper.fetchById(checkinList[i].attach));
    }
    return Promise.all(queryAttach)
    .then(attachList => {
      for (let i=0; i<checkinList.length; i++) {
        attachList[i].url = qiniuComponent.getAccessibleUrl(attachList[i].attachType, attachList[i].key);
        checkinList[i].attach = attachList[i];
      }
      return checkinList;
    })
  });
}

/**
 * 分页查询打卡列表
 */
pub.queryPagedCheckinList = queryParam => {
  return taskCheckinMapper.queryPagedCheckinList(
    queryParam,
    queryParam.pageNumber,
    queryParam.pageSize
  ).then(result => {
    const checkinList = result.values;
    const queryAttach = [];
    for (let i=0; i<checkinList.length; i++) {
      queryAttach.push(attachMapper.fetchById(checkinList[i].attach));
    }
    return Promise.all(queryAttach)
    .then(attachList => {
      for (let i=0; i<checkinList.length; i++) {
        attachList[i].url = qiniuComponent.getAccessibleUrl(attachList[i].attachType, attachList[i].key);
        checkinList[i].attach = attachList[i];
      }
      result.values = checkinList;
      return result;
    })
  });
};

/**
 * 获取打卡详情
 */
pub.fetchCheckinById = (checkinId) => {
  if (_.isNil(checkinId)) {
    winston.error("获取打卡详情失败，参数错误！！！ checkinId: %s", checkinId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return taskCheckinMapper.findById(checkinId);
}

/**
 * 点赞打卡记录
 */
pub.likeCheckin = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error('参数错误！！！ userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const likeArr = checkin.likeArr || [];
  if (likeArr.includes(userId)) {
    return Promise.reject(commonError.BIZ_FAIL_ERROR("已点赞过该打卡"));
  } else {
    likeArr.push(userId);
    return taskCheckinMapper.updateById(checkin.id, {likeArr: likeArr})
  }
}

pub.cancelLikeCheckin = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error('参数错误！！！ userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const likeArr = checkin.likeArr || [];
  likeArr.pop(userId);
  return taskCheckinMapper.updateById(checkin.id, {likeArr: likeArr})
}

pub.countByParam = queryParam => {
  console.log(queryParam);
  return taskCheckinMapper.countByParam(queryParam);
}

module.exports = pub;
