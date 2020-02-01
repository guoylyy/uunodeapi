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
const userFileMapper = require("../dao/mongodb_mapper/userFile.mapper");
const moment = require("moment");

const pub = {};

/**
 * 分页查询课程列表
 */
pub.queryTaskList = queryParam => {
  queryParam.title &&
    (queryParam.title = {
      $regex: RegExp(queryParam.title, "i")
    });
  console.log(queryParam);
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
  let param = { pushAt: moment().format("YYYY-MM-DD") };
  return pushTaskMapper.findByParam(param).then(pushTask => {
    // task对象 打卡数量 打卡人员列表 promise all
    if (!_.isNil(pushTask)) {
      return Promise.all([
        pub.fetchById(pushTask.taskId),
        taskCheckinMapper.queryCheckinList({ taskId: pushTask.taskId })
      ]).then(([task, checkinList]) => {
        let fetchUser = [];
        new Set(_.map(checkinList, "userId")).forEach(userId => {
          fetchUser.push(userMapper.fetchByParam({ id: userId }));
        });
        return Promise.all(fetchUser).then(userList => {
          task.headImgUrlList = _.map(userList, "headImgUrl");
          const defaultHeadImg = [
            "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJrjwowQB5WFKosOe4TSbhaDIicmKZ3PZR6LQ1T9NFAhyibFuMvdjDCYOqHFWCuAuY0IicBeKqklMtgQ/132",
            "https://wx.qlogo.cn/mmopen/BaibzQDtAJbLBrdHeT4GbLJiaGgpzNeqnv3uZNcZZeRbs0piciaToPnXmM5ZYcApkBX9gYnHymIhT9YbdqkoxEcian9RTlKQibppdC/0",
            "https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1580386008061&di=deae1a23df019332e31e9774d324161b&imgtype=0&src=http%3A%2F%2Fwww.vvfeng.com%2Fdata%2Fupload%2Fueditor%2F20181121%2F5bf4f3f00b53d.jpg",
            "https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1580386008060&di=5bec0c942cc32c61654f8ccf5a15fe9d&imgtype=0&src=http%3A%2F%2Fpic.9ht.com%2Fup%2F2018-7%2F15312794628096861.jpg",
            "https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1580386008060&di=3d307b8bd3ebc4af6873118a0dfbd0c1&imgtype=0&src=http%3A%2F%2Fimage.biaobaiju.com%2Fuploads%2F20180801%2F21%2F1533129201-eRalzJBYUH.jpg"
          ];
          while (task.headImgUrlList.length < 5) {
            task.headImgUrlList.push(
              defaultHeadImg[task.headImgUrlList.length]
            );
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
  return Promise.all([
    taskMapper.findById(taskCheckin.taskId),
    userFileMapper.fetchById(taskCheckin.attach)
  ]).then(([task, userFile]) => {
    if (_.isNil(userFile)) {
      winston.error(
        "获取用户文件失败，参数错误！！！ taskCheckin.attach: %s",
        taskCheckin.attach
      );
      return Promise.reject(commonError.PARAMETER_ERROR("音频附件不存在"));
    }
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
      queryAttach.push(userFileMapper.fetchById(checkinList[i].attach));
    }
    return Promise.all(queryAttach).then(attachList => {
      for (let i = 0; i < checkinList.length; i++) {
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
        queryAttach.push(userFileMapper.fetchById(checkinList[i].attach));
      }
      return Promise.all(queryAttach).then(attachList => {
        const queryUser = [];
        for (let i = 0; i < checkinList.length; i++) {
          const checkin = checkinList[i];
          checkin.viewerCount = new Set(_.map(checkin.viewLog, "userId")).size;
          checkin.viewLog = undefined;
          checkin.attach = attachList[i];
          queryUser.push(userMapper.fetchByParam({ id: checkin.userId }));
        }
        return Promise.all(queryUser).then(userList => {
          for (let i = 0; i < checkinList.length; i++) {
            const checkin = checkinList[i];
            checkin.user = _.pick(userList[i], ["id", "name", "headImgUrl"]);
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

/**
 * 删除任务
 */
pub.deleteTask = taskId => {
  return taskMapper.deleteById(taskId);
};

/**
 * 创建任务
 */
pub.createTask = task => {
  return taskMapper.createTask(task);
};

/**
 * 更新任务
 */
pub.updateTask = task => {
  return taskMapper.updateTaskById(task);
};

/**
 * 创建每日推送任务
 */
pub.createPushTask = pushTask => {
  return pushTaskMapper.findByParam({ pushAt: pushTask.pushAt }).then(item => {
    if (!_.isNil(item)) {
      return Promise.reject(
        commonError.BIZ_FAIL_ERROR(
          `当日已存在推送任务 pushAt: ${pushTask.pushAt}`
        )
      );
    }
    return pushTaskMapper.createPushTask(pushTask);
  });
};

/**
 * 创建每日推送任务
 */
pub.getPushTaskList = queryParam => {
  return pushTaskMapper
    .queryPagedPushTaskList(
      queryParam,
      queryParam.pageNumber,
      queryParam.pageSize
    )
    .then(result => {
      let taskQuery = [];
      const pushTaskList = result.values;
      for (let i = 0; i < pushTaskList.length; i++) {
        const pushTask = pushTaskList[i];
        taskQuery.push(taskMapper.findById(pushTask.taskId));
      }
      return Promise.all(taskQuery).then(taskList => {
        for (let i = 0; i < taskList.length; i++) {
          pushTaskList[i].task = taskList[i];
        }
        result.values = pushTaskList;
        return result;
      });
    });
};

/**
 * 删除推送任务
 */
pub.deletePushTask = pushTaskId => {
  return pushTaskMapper.deleteById(pushTaskId);
};

/**
 * 统计200天之内的打卡统计数据
 */
pub.fetchTaskCheckinStatistics = userId => {
  return Promise.all([
    taskCheckinMapper.sumGroupByUserIdAndDate(userId, 200),
    taskCheckinMapper.sumPracticeTime(userId),
    taskCheckinMapper.sumTodayPracticeTime(userId),
    taskCheckinMapper.sumPracticeTimeByLanguage(userId),
    taskCheckinMapper.sumCheckinDaysByUserId(userId)
  ]).then(
    ([
      records,
      [totalPracticeTime],
      [todayPracticeTime],
      languagePracticeTime,
      [checkinDays]
    ]) => {
      const result = {
        records: records || [],
        totalPracticeTime: !!totalPracticeTime
          ? totalPracticeTime.practiceTime
          : 0,
        todayPracticeTime: !!todayPracticeTime
          ? todayPracticeTime.practiceTime
          : 0,
        languagePracticeTime: languagePracticeTime || [],
        checkinDays: !!checkinDays ? checkinDays.count : 0
      };
      return result;
    }
  );
};

/**
 * 获取周打卡排行榜和个人信息
 */
pub.getCheckinWeekRank = (userId) => {
  return taskCheckinMapper.checkinWeekRank()
  .then(checkinRank => {
    const fetchUser = [];
    checkinRank.forEach(item => {
      fetchUser.push(userMapper.fetchByParam({id: item._id}));
    })
    return Promise.all(fetchUser)
    .then(userList => {
      for (let i=0; i<userList.length; i++) {
        checkinRank[i].user = userList[i] || {};
      }
      return checkinRank;
    });
  });
};

/**
 * 我的打卡排行榜的个人信息
 */
pub.getMyCheckinWeekData = (userId) => {
  return taskCheckinMapper.myCheckinWeekData(userId)
    .then(([myCheckinWeekData]) => {
      console.log(myCheckinWeekData);
      if (_.isNil(myCheckinWeekData)) {
        return {
          "_id" : userId,
          rank: 99999,
          practiceTime: 0,
        }
      }
      return myCheckinWeekData;
    });
}

/**
 * 我的排行榜-笔芯榜
 */
pub.getLikeCountWeekRank = () => {
  return taskCheckinMapper.likeCountWeekRank()
    .then(likeCountWeekRank => {
      const fetchUser = [];
      likeCountWeekRank.forEach(item => {
        fetchUser.push(userMapper.fetchByParam({id: item._id}));
      })
      return Promise.all(fetchUser)
      .then(userList => {
        for (let i=0; i<userList.length; i++) {
          likeCountWeekRank[i].user = userList[i] || {};
        }
        return likeCountWeekRank;
      });
    });
}

/**
 * 我的排行榜-笔芯榜 我的信息
 */
pub.getMyLikeCountWeekData = (userId) => {
  return taskCheckinMapper.myLikeCountWeekData(userId)
    .then(([myLikeCountWeekData]) => {
      if (_.isNil(myLikeCountWeekData)) {
        return {
          "_id" : userId,
          rank: 99999,
          likeCount: 0
        }
      }
      return myLikeCountWeekData;
    });
}

/**
 * 获取打卡详情
 */
pub.getShareCheckin = checkinId => {
  if (_.isNil(checkinId)) {
    winston.error("获取打卡详情失败，参数错误！！！ checkinId: %s", checkinId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return taskCheckinMapper.findById(checkinId)
  .then(checkin => {
    const userId = checkin.userId;
      return Promise.all([
        userMapper.fetchByParam({id: userId}),
        taskCheckinMapper.sumCheckinDaysByUserId(userId),
        taskCheckinMapper.sumTodayPracticeTime(userId),
        attachMapper.fetchById(checkin.attach)
      ])
      .then(([
        user,
        [checkinDays],
        [todayPracticeTime],
        attach
      ]) => {
        user.todayPracticeTime= !!todayPracticeTime? todayPracticeTime.practiceTime: 0,
        user.checkinDays= !!checkinDays ? checkinDays.count : 0
        console.log(user);
        checkin.user = user;
        checkin.attach = attach;
        return checkin;
      })
  });
};

module.exports = pub;
