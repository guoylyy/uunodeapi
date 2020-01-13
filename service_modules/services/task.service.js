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
const userMapper = require("../dao/mysql_mapper/user.mapper");

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
    ]).then(
      ([srcAudioAttach, srcVideoAttach, oppoAudioAttach, oppoVideoAttach]) => {
        if (!_.isNil(srcAudioAttach)) {
          srcAudioAttach.url = qiniuComponent.getAccessibleUrl(
            srcAudioAttach.attachType,
            srcAudioAttach.key
          );
          task.srcAudio = srcAudioAttach;
        }
        if (!_.isNil(srcVideoAttach)) {
          srcVideoAttach.url = qiniuComponent.getAccessibleUrl(
            srcVideoAttach.attachType,
            srcVideoAttach.key
          );
          task.srcVideo = srcVideoAttach;
        }
        if (!_.isNil(oppoAudioAttach)) {
          oppoAudioAttach.url = qiniuComponent.getAccessibleUrl(
            oppoAudioAttach.attachType,
            oppoAudioAttach.key
          );
          task.oppoAudio = oppoAudioAttach;
        }
        if (!_.isNil(oppoVideoAttach)) {
          srcVideoAttach.url = qiniuComponent.getAccessibleUrl(
            oppoVideoAttach.attachType,
            oppoVideoAttach.key
          );
          task.oppoVideo = oppoVideoAttach;
        }
        return task;
      }
    );
  });
};



/**
 * 获取当日任务
 */
pub.fetchTodayTask = () => {
  const currentDate = new Intl.DateTimeFormat("en-US").format(new Date());
  let param = { pushAt: currentDate };
  return pushTaskMapper.findByParam(param).then(pushTask => {
    // task对象 打卡数量 打卡人员列表 promise all
    if (!_.isNil(pushTask)) {
      return Promise.all([
        pub.fetchById(pushTask.taskId),
        taskCheckinMapper.countByParam({ taskId: pushTask.taskId }),
        taskCheckinMapper.queryCheckinList({ taskId: pushTask.taskId })
      ]).then(([task, checkinCount, checkinList]) => {
        let fetchUser = [];
        new Set(_.map(checkinList, "userId")).forEach(userId => {
          fetchUser.push(userMapper.fetchByParam({ id: userId }));
        });
        return Promise.all(fetchUser).then(userList => {
          task.headImgUrlList = _.map(userList, "headImgUrl");
          const defaultHeadImg = [
            "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJrjwowQB5WFKosOe4TSbhaDIicmKZ3PZR6LQ1T9NFAhyibFuMvdjDCYOqHFWCuAuY0IicBeKqklMtgQ/132",
            "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKbRGQDP3eIEu1iabJGFw2xz7ibJzRlHZz8d3oJxSwjmJqLaQbf6gYmz79PicT5RsPfF3EhZVraKqLoA/132",
            "https://thirdwx.qlogo.cn/mmopen/KydxAIB52xmUibXYsmaaadCibBOFSnMgGdPiaFwrO39GwSoVF1kTv1hYQPJWrV3WgIIM9HPpvY8fJPDkl51GNHic1w/132",
            "https://thirdwx.qlogo.cn/mmopen/vi_32/Q3auHgzwzM7Z3yA0gicP9mMezG57KibEpCWAt1baSAtUFYiavRKDyotNGHicjiaeRIjxanHSjbyEHibibAicAhdib2JAY0A/132",
            "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJ0LP3VXv0uYuyluLNbr4ytD9TjYhzorcnLz5OdZ2FHpjTsdC72QVibeWrL4RezPoTmMfB1XxoYOXw/132"
          ];
          while (task.headImgUrlList.length < 5) {
            task.headImgUrlList.push(defaultHeadImg[task.headImgUrlList.length])
          }
          task.checkinCount = userList.length < 10 ? 10 : userList.length;
          return task;
        });
      });
    }
    return null;
  });
};

/**
 * 打卡
 */
pub.checkin = taskCheckin => {
  taskMapper.findById(taskCheckin.taskId).then(task => {
    taskCheckin.task = task;
    return taskCheckinMapper.checkin(taskCheckin);
  });
};

/**
 * 获取打卡列表
 */
pub.getCheckinList = queryParam => {
  return taskCheckinMapper.queryCheckinList(queryParam).then(checkinList => {
    const queryAttach = [];
    for (let i = 0; i < checkinList.length; i++) {
      queryAttach.push(attachMapper.fetchById(checkinList[i].attach));
    }
    return Promise.all(queryAttach).then(attachList => {
      for (let i = 0; i < checkinList.length; i++) {
        attachList[i].url = qiniuComponent.getAccessibleUrl(
          attachList[i].attachType,
          attachList[i].key
        );
        checkinList[i].attach = attachList[i];
      }
      return checkinList;
    });
  });
};

/**
 * 分页查询打卡列表
 */
pub.queryPagedCheckinList = queryParam => {
  return taskCheckinMapper
    .queryPagedCheckinList(
      queryParam,
      queryParam.pageNumber,
      queryParam.pageSize
    )
    .then(result => {
      const checkinList = result.values;
      const queryAttach = [];
      for (let i = 0; i < checkinList.length; i++) {
        queryAttach.push(attachMapper.fetchById(checkinList[i].attach));
      }
      return Promise.all(queryAttach).then(attachList => {
        const queryUser = [];
        for (let i = 0; i < checkinList.length; i++) {
          attachList[i].url = qiniuComponent.getAccessibleUrl(
            attachList[i].attachType,
            attachList[i].key
          );
          const checkin = checkinList[i];
          checkin.viewerCount = new Set(_.map(checkin.viewLog, 'userId')).size;
          checkin.viewLog = undefined;
          checkin.attach = attachList[i];
          queryUser.push(userMapper.fetchByParam({id: checkin.userId}))
        }
        return Promise.all(queryUser).then(userList => {
          for (let i = 0; i < checkinList.length; i++) {
            const checkin = checkinList[i];
            checkin.user = _.pick(userList[i], ['id', 'name', 'headImgUrl']);
          }
          result.values = checkinList;
          return result;
        });
      });
    });
};

/**
 * 获取打卡详情
 */
pub.fetchCheckinById = checkinId => {
  if (_.isNil(checkinId)) {
    winston.error("获取打卡详情失败，参数错误！！！ checkinId: %s", checkinId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return taskCheckinMapper.findById(checkinId);
};

/**
 * 点赞打卡记录
 */
pub.likeCheckin = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error("参数错误！！！ userId: %s", userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const likeArr = checkin.likeArr || [];
  if (likeArr.includes(userId)) {
    return Promise.reject(commonError.BIZ_FAIL_ERROR("已点赞过该打卡"));
  } else {
    likeArr.push(userId);
    return taskCheckinMapper.updateById(checkin.id, { likeArr: likeArr });
  }
};

pub.cancelLikeCheckin = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error("参数错误！！！ userId: %s", userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const likeArr = checkin.likeArr || [];
  likeArr.pop(userId);
  return taskCheckinMapper.updateById(checkin.id, { likeArr: likeArr });
};

pub.countByParam = queryParam => {
  return taskCheckinMapper.countByParam(queryParam);
};

/**
 * 更新打卡记录
 */
pub.updateTaskCheckin = (checkinId, param) => {
  return taskCheckinMapper.updateById(checkinId, param);
};

/**
 * 删除打卡记录
 */
pub.deleteTaskCheckin = checkinId => {
  return taskCheckinMapper.deleteById(checkinId);
};

module.exports = pub;
