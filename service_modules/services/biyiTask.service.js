"use strict";

const _ = require("lodash");
const winston = require("winston");
const Promise = require("bluebird");
const taskMapper = require("../dao/mongodb_mapper/biyiTask.mapper");
const taskCheckinMapper = require("../dao/mongodb_mapper/biyiTaskCheckin.mapper");
const pushTaskMapper = require("../dao/mongodb_mapper/pushTask.mapper");
const commonError = require("./model/common.error");
const qiniuComponent = require("./component/qiniu.component");
const userMapper = require("../dao/mysql_mapper/user.mapper");
const userFileMapper = require("../dao/mongodb_mapper/userFile.mapper");
const moment = require("moment");
const gm = require("gm");
const jimp = require("jimp");
const fs = require("fs");
const pub = {};
const commonUtil = require("./util/common.util");

/**
 * 分页查询课程列表
 */
pub.queryTaskList = queryParam => {
  queryParam.title &&
    (queryParam.title = {
      $regex: RegExp(queryParam.title, "i")
    });
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
    return task;
  });
};

/**
 * 获取当日任务列表
 */
pub.fetchTodayTask = () => {
  let param = {
    pushAt: moment().format("YYYY-MM-DD"),
    weappType: "BIYI"
  };
  return pushTaskMapper.queryList(param).then(pushTaskList => {
    if (!_.isEmpty(pushTaskList)) {
      let fetchBiyiTaskList = [];
      for (let i = 0; i < pushTaskList.length; i++) {
        fetchBiyiTaskList.push(taskMapper.findById(pushTaskList[i].taskId));
      }
      return Promise.all(fetchBiyiTaskList);
    }
    return [];
  });
};

/**
 * 打卡
 */
pub.checkin = taskCheckin => {
  return taskCheckinMapper.countByParam({taskId: taskCheckin.taskId, userId: taskCheckin.userId})
  .then(checkinCount => {
    if (checkinCount == 0) {
      return taskMapper.findById(taskCheckin.taskId)
      .then(task => {
        taskCheckin.task = task;
        return taskCheckinMapper.checkin(taskCheckin);
      });
    } else {
      return Promise.reject(commonError.BIZ_FAIL_ERROR("已经打卡过该练习"))
    }
  })
  
};

/**
 * 获取打卡列表
 */
pub.getCheckinList = queryParam => {
  return taskCheckinMapper.queryCheckinList(queryParam);
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
      const queryUser = [];
      for (let i = 0; i < checkinList.length; i++) {
        const checkin = checkinList[i];
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

/**
 * 统计打卡数量
 */
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
  return pushTaskMapper.createPushTask(pushTask);
};

/**
 * 获取每日推送任务
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

/** 个人排行榜 */
/**
 * 获取周打卡排行榜和个人信息
 */
pub.getCheckinWeekRank = userId => {
  return taskCheckinMapper.checkinWeekRank().then(checkinRank => {
    const fetchUser = [];
    checkinRank.forEach(item => {
      fetchUser.push(userMapper.fetchByParam({ id: item._id }));
    });
    return Promise.all(fetchUser).then(userList => {
      for (let i = 0; i < userList.length; i++) {
        checkinRank[i].user = userList[i] || {};
      }
      return checkinRank;
    });
  });
};

/**
 * 我的打卡排行榜的个人信息
 */
pub.getMyCheckinWeekData = userId => {
  return taskCheckinMapper
    .myCheckinWeekData(userId)
    .then(([myCheckinWeekData]) => {
      if (_.isNil(myCheckinWeekData)) {
        return {
          _id: userId,
          rank: 99999,
          practiceTime: 0
        };
      }
      return myCheckinWeekData;
    });
};

/**
 * 我的排行榜-笔芯榜
 */
pub.getLikeCountWeekRank = () => {
  return taskCheckinMapper.likeCountWeekRank().then(likeCountWeekRank => {
    const fetchUser = [];
    likeCountWeekRank.forEach(item => {
      fetchUser.push(userMapper.fetchByParam({ id: item._id }));
    });
    return Promise.all(fetchUser).then(userList => {
      for (let i = 0; i < userList.length; i++) {
        likeCountWeekRank[i].user = userList[i] || {};
      }
      return likeCountWeekRank;
    });
  });
};

/**
 * 我的排行榜-笔芯榜 我的信息
 */
pub.getMyLikeCountWeekData = userId => {
  return taskCheckinMapper
    .myLikeCountWeekData(userId)
    .then(([myLikeCountWeekData]) => {
      if (_.isNil(myLikeCountWeekData)) {
        return {
          _id: userId,
          rank: 99999,
          likeCount: 0
        };
      }
      return myLikeCountWeekData;
    });
};

/** 学校排行榜 */
/**
 * 获取学校周打卡排行榜和个人信息
 */
pub.getSchoolCheckinWeekRank = userId => {
  return taskCheckinMapper.schoolCheckinWeekRank().then(checkinRank => {
    const countUsers = [];
    checkinRank.forEach(item => {
      countUsers.push(userMapper.countBySchool(item._id));
    });
    return Promise.all(countUsers).then(countList => {
      for (let i = 0; i < countList.length; i++) {
        checkinRank[i].userCount = countList[i] || 0;
      }
      return checkinRank;
    });
  });
};

/**
 * 我的学校打卡排行榜的个人信息
 */
pub.getMySchoolCheckinWeekData = user => {
  return taskCheckinMapper
    .mySchoolCheckinWeekData(user.school)
    .then(([myCheckinWeekData]) => {
      if (_.isNil(myCheckinWeekData)) {
        return {
          _id: user.school || "",
          rank: 99999,
          practiceTime: 0
        };
      }
      return myCheckinWeekData;
    });
};

/**
 * 我的排行榜-笔芯榜
 */
pub.getSchoolLikeCountWeekRank = () => {
  return taskCheckinMapper.schoolLikeCountWeekRank().then(likeCountWeekRank => {
    const countUsers = [];
    likeCountWeekRank.forEach(item => {
      countUsers.push(userMapper.countBySchool(item._id));
    });
    return Promise.all(countUsers).then(countList => {
      for (let i = 0; i < countList.length; i++) {
        likeCountWeekRank[i].userCount = countList[i] || 0;
      }
      return likeCountWeekRank;
    });
  });
};

/**
 * 我的排行榜-笔芯榜 我的信息
 */
pub.getMySchoolLikeCountWeekData = user => {
  return taskCheckinMapper
    .mySchoolLikeCountWeekData(user.school)
    .then(([myLikeCountWeekData]) => {
      if (_.isNil(myLikeCountWeekData)) {
        return {
          _id: user.school || "",
          rank: 99999,
          likeCount: 0
        };
      }
      return myLikeCountWeekData;
    });
};

/**
 * 获取打卡详情
 */
pub.getShareCheckin = checkinId => {
  if (_.isNil(checkinId)) {
    winston.error("获取打卡详情失败，参数错误！！！ checkinId: %s", checkinId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return taskCheckinMapper.findById(checkinId).then(checkin => {
    const userId = checkin.userId;
    return Promise.all([
      userMapper.fetchByParam({ id: userId }),
      taskCheckinMapper.sumCheckinDaysByUserId(userId),
      taskCheckinMapper.sumTodayPracticeTime(userId),
      userFileMapper.fetchById(checkin.attach)
    ]).then(([user, [checkinDays], [todayPracticeTime], userFile]) => {
      (user.todayPracticeTime = !!todayPracticeTime
        ? todayPracticeTime.practiceTime
        : 0),
        (user.checkinDays = !!checkinDays ? checkinDays.count : 0);
      checkin.user = user;
      checkin.attach = userFile;
      return checkin;
    });
  });
};

const getCircleImage = async (url, saveName) => {
  const maskImage = `${global.__projectDir}/resources/maskCircle.png`;
  const mainPhoto = await jimp.read(encodeURI(url));
  const mask = await jimp.read(maskImage);

  return new Promise((resolve, reject) => {
    mainPhoto
      .resize(512, 512)
      .mask(mask, 0, 0)
      .write(`${global.__projectDir}/public/${saveName}.png`, err => {
        if (err) {
          reject(err);
        } else {
          resolve(`${global.__projectDir}/public/${saveName}.png`);
        }
      });
  });
};

/**
 * 获取分享信息
 */
pub.getShareInfo = checkinId => {
  if (_.isNil(checkinId)) {
    winston.error("获取分享信息失败，参数错误！！！ checkinId: %s", checkinId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return pub.getShareCheckin(checkinId).then(checkin => {
    const title =
      checkin.task.title.slice(0, 10) + "\r\n" + checkin.task.title.slice(10);
    const taskImg = checkin.task.pic;
    const headImg = checkin.user.headImgUrl;
    return Promise.all([
      getCircleImage(headImg, `${checkin.id}_headImg`),
      getCircleImage(taskImg, `${checkin.id}_taskImg`)
    ]).then(([headImgPath, taskImgPath]) => {
      const checkinDays = checkin.user.checkinDays,
        todayPracticeMinutes = Math.ceil(checkin.user.todayPracticeTime / 60);
      let checkinDaysX = 655,
        todayPracticeMinutesX = 1105;
      const fontPx = 18;
      // 跳转动态数字偏移量
      if (checkinDays >= 100) {
        checkinDaysX -= fontPx * 2;
      } else if (checkinDays >= 10) {
        checkinDaysX -= fontPx;
      }
      if (todayPracticeMinutes >= 100) {
        todayPracticeMinutesX -= fontPx * 2;
      } else if (todayPracticeMinutes >= 10) {
        todayPracticeMinutesX -= fontPx;
      }
      return new Promise((resolve, reject) => {
        gm(`${global.__projectDir}/resources/sharePost.png`)
          .draw(`image Over 372 128 622.8 622.8 ${taskImgPath}`) //任务图片
          .draw(`image Over 120 1343 260 260 ${headImgPath}`) //头像图片
          .font(`${global.__projectDir}/resources/HYQiHei-60S.ttf`)
          .fontSize(72)
          .fill("#fff")
          .drawText(10, 1100, title, "North") //标题
          .fontSize(56)
          .fill("#0ACAF6")
          .drawText(checkinDaysX, 1561, checkinDays + "") //累计口译
          .drawText(todayPracticeMinutesX, 1561, todayPracticeMinutes + "") //今日口译
          .fontSize(60)
          .fill("#1A1E1E")
          .drawText(423, 1463, checkin.user.name) //微信名
          .write(`${global.__projectDir}/public/${checkin.id}.png`, err => {
            if (err) {
              reject(err);
            } else {
              const filePath = `${global.__projectDir}/public/${checkin.id}.png`;
              console.log("Finished! Upload to Qiniu CDN"); //这里做上传，上传完成后可以删除本地生成图片 一共三张
              fs.unlinkSync(taskImgPath);
              fs.unlinkSync(headImgPath);
              qiniuComponent
                .uploadFilePromise(
                  "SECRET",
                  _.now() +
                    "_" +
                    commonUtil.generateRandomString(7) +
                    "_" +
                    `${checkin.id}.png`,
                  "png",
                  filePath
                )
                .then(result => {
                  fs.unlinkSync(filePath);
                  resolve({
                    imgUrl: qiniuComponent.getAccessibleUrl(
                      "SECRET",
                      result.key
                    )
                  });
                });
            }
          });
      });
    });
  });
};

module.exports = pub;