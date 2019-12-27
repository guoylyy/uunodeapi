"use strict";

const _ = require("lodash");
const winston = require("winston");
const Promise = require("bluebird");
const debug = require("debug")("service");
const taskMapper = require("../dao/mongodb_mapper/task.mapper");
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
  const currentDate = new Intl.DateTimeFormat('en-US').format(new Date())
  let param = {pushAt: currentDate};
  return pushTaskMapper.findByParam(param)
  .then(pushTask => {
    if (!_.isNil(pushTask)) {
      return pub.fetchById(pushTask.taskId)
    } else {
      winston.error("今日任务为空 时间:%s", currentDate);
      return Promise.reject(commonError.NOT_FOUND_ERROR);
    }
  });
};

pub.checkin = (taskCheckin) => {
  
}

module.exports = pub;
