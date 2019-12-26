"use strict";

const _ = require("lodash");
const winston = require("winston");
const Promise = require("bluebird");
const debug = require("debug")("service");
const taskMapper = require("../dao/mongodb_mapper/task.mapper");
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

pub.fetchById = taskId => {
  if (_.isNil(taskId)) {
    winston.error("获取任务详情失败，参数错误！！！ taskId: %s", taskId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return taskMapper.findById(taskId).then(task => {
    return Promise.all([attachMapper.fetchById(task.srcAudio), attachMapper.fetchById(task.srcVideo)])
      .then(([audioAttach, videoAttach]) => {
        if (!_.isNil(audioAttach) && !_.isNil(videoAttach)) {
          audioAttach.url = qiniuComponent.getAccessibleUrl(
            audioAttach.attachType,
            audioAttach.key
          );
          task.srcAudio = audioAttach;
          videoAttach.url = qiniuComponent.getAccessibleUrl(
            videoAttach.attachType,
            videoAttach.key
          );
          task.srcVideo = videoAttach;
        }
        return task;
      })
  });
};

pub.fetchTodayTask = () => {
    return pub.fetchById("5e007e310e992bcd972f2f4e");
}

module.exports = pub;
