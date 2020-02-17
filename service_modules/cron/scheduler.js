'use strict';

const _ = require('lodash');
const winston = require('winston');
const debug = require('debug')('schedule');
const moment = require('moment');
const schedule = require('node-schedule');

const enumModel = require('../services/model/enum');

const scheduleTask = require('./schedule.task');

const postService = require('../services/post.service');

/**
 * 配置，默认加载的提前小时数
 * @type {number}
 */
const MINUS_HOURS = -6;

/**
 * 定时任务记录
 * id -> scheduler task
 *
 * @type {{
 * name: string,
 * endDate: date,
 * job: {schedule.Job}
 * }}
 */
const TASK_RECORD_MAP = {};

let mapCronJobToSchedule = (cronJob) => {
  let jobFunctionName = cronJob.taskFun,
      jobParams = cronJob.taskParams;

  // 检查 cronJob 是否为对象，cronJob.taskFun 是否为字符串，cronJob.taskParams 是否为数组
  if (!_.isPlainObject(cronJob) || !_.isString(jobFunctionName) || !_.isArray(jobParams)) {
    throw new Error('cronJob必须为对象，cronJob.taskFun必须为字符串，cronJob.taskParams必须为数组');
  }

  // 检查 任务是否存在
  let jobFunction = scheduleTask[jobFunctionName];
  if (!_.isFunction(jobFunction)) {
    throw new Error('cronJob.taskFun所指定的任务不存在');
  }
  // 新建定时任务方法
  let scheduleJob = () => {
    winston.info('定时任务 %s 开始执行', cronJob.name);
    scheduleTask[cronJob.taskFun].apply(cronJob, cronJob.taskParams);
  };

  switch (cronJob.type) {
    case enumModel.cronJobTypeEnum.DAILY.key:
      let startDateStr = cronJob.startDate,
          endDateStr = cronJob.endDate;

      // 检查 cronJob.startDate 和 cronJob.endDate 是否为时间字符串
      if (!Date.parse(startDateStr) || !Date.parse(endDateStr) || moment(startDateStr).isAfter(endDateStr) || moment().isAfter(endDateStr)) {
        throw new Error('cronJob.startDate 和 cronJob.endDate 必须为合法的时间字符串');
      }
      // 检查 cronJob.hour 是否在 [0, 24) 之间
      if (!_.isSafeInteger(cronJob.hour) || !_.inRange(cronJob.hour, 0, 24)) {
        throw new Error('cronJob.hour 必须为[0, 24)间的合法整数');
      }
      // 检查 cronJob.minute 是否在 [0, 60) 之间
      if (!_.isSafeInteger(cronJob.minute) || !_.inRange(cronJob.minute, 0, 60)) {
        throw new Error('cronJob.minute 必须为[0, 60)间的合法整数');
      }

      let startDate = moment(startDateStr).toDate(),
          endDate = moment(endDateStr).toDate();

      let dailyJob = schedule.scheduleJob(
          cronJob.name,
          {
            start: startDate,
            end: endDate,
            rule: {
              hour: cronJob.hour,
              minute: cronJob.minute
            }
          },
          scheduleJob,
          cronJob.callback
      );

      if (_.isNil(dailyJob)) {
        throw new Error('创建定时任务失败');
      }

      return dailyJob;
      break;
    case enumModel.cronJobTypeEnum.JUST_ONCE.key:
      const nowMoment = moment(),
          cronJobDateStr = cronJob.date;

      // 检查 cronJob.date 是否为时间字符串
      if (!Date.parse(cronJobDateStr)) {
        throw new Error('cronJob.date 必须为合法的时间字符串');
      }

      let executeDate;
      if (nowMoment.isSameOrAfter(cronJobDateStr)) {
        // 延迟5s
        executeDate = nowMoment.add(5, 'seconds').toDate();
      } else {
        executeDate = moment(cronJobDateStr).toDate();
      }

      const justOnceJob = schedule.scheduleJob(cronJob.name, executeDate, scheduleJob, cronJob.callback);

      if (_.isNil(justOnceJob)) {
        throw new Error('创建定时任务失败');
      }

      return justOnceJob;
      break;
    default:
      throw new Error('不支持的定时任务类型');
  }
};

/**
 * 从数据库中装载未推送的推送任务
 */
let reloadFromDB = () => {
  // 首先移除旧任务
  _.forEach(TASK_RECORD_MAP, (task, key) => {
    pub.removeTask(key);
  });

  // 加载过去MINUS_HOURS小时到未来25分钟的推送任务
  const startDate = moment().add(MINUS_HOURS, 'hours').toDate(),
      endDate = moment().add(25, 'minutes').toDate();

  postService.listAllAvailablePosts(startDate, endDate)
      .then((postList) => {
        debug(postList);

        return _.map(postList, (post) => {
          return {
            id: post.id,
            name: post.title,
            type: enumModel.cronJobTypeEnum.JUST_ONCE.key,
            taskFun: 'pushPost',
            taskParams: [post.clazzId, post.id],
            date: post.targetDate,
          };
        });
      })
      .then((cronJobList) => {
        debug(cronJobList);
        return _.map(cronJobList, pub.addTask);
      })
      .then((results) => {
        let countResult = _.countBy(results);

        winston.info('加载推送任务 成功 %s 个，失败 %s 个', countResult[true] || 0, countResult[false] || 0);
        return null;
      })
      .catch((error) => {
        winston.error(error);

        // todo 加载任务失败错误处理
      })
};

let pub = {};

// 增加任务
pub.addTask = (cronJob) => {
  try {
    let cronJobId = cronJob.id;

    if (_.isNil(cronJobId)) {
      winston.error('增加任务失败，参数错误！！！cronJob: %j', cronJob);
      return false;
    }

    // 1. 移除旧任务
    let oldScheduleJob = _.get(TASK_RECORD_MAP[cronJobId], 'job', null);
    if (!_.isNil(oldScheduleJob)) {
      let rs = schedule.cancelJob(oldScheduleJob);

      winston.info('移除旧任务 %s : %j', cronJobId, rs);
    }
    // 2. 增加新任务
    TASK_RECORD_MAP[cronJobId] = mapCronJobToSchedule(cronJob);

    winston.info('增加任务成功，cronJob: %j', cronJob);
    return true;
  } catch (error) {
    winston.error('增加任务失败！！！cronJob: %j', cronJob);
    winston.error(error);

    return false;
  }
};

// 移除任务
pub.removeTask = (id) => {
  try {
    let scheduleJob = TASK_RECORD_MAP[id];

    debug(!_.isNil(scheduleJob));

    // 如果任务存在，则移除至
    if (!_.isNil(scheduleJob)) {
      let rs = schedule.cancelJob(scheduleJob);
      if (rs !== true) {
        winston.error('移除任务失败！！！cronName: %s', id);

        return;
      }
    }

    winston.info('移除任务成功，name: %j', id);
    return delete TASK_RECORD_MAP[id];
  } catch (error) {
    winston.error('移除任务失败！！！cronName: %s', id);
    winston.error(error);
  }
};

module.exports = pub;

// 先加载一遍推送任务
reloadFromDB();

/**
 * 定时查看现有任务列表
 */
schedule.scheduleJob(
    'scheduler reload',
    '*/10 * * * *', // every 10 minutes
    // '*/5 * * * * *', // every 5 seconds
    reloadFromDB
);

/**
 * 定时查看现有任务列表
 */
schedule.scheduleJob(
    'wechat token',
    '18,48 * * * *', // each HH:18 and HH:48
    scheduleTask.syncWechatTokenAndTicket
);

/**
 * 定时推送未成功记录
 */
schedule.scheduleJob(
    'resend fail pushes',
    '19,49 * * * *', // 19分及49分的时候重新推送
    scheduleTask.repushFailTemplates
);

/**
 * 定时查看现有任务列表
 */
schedule.scheduleJob(
    'scheduler checker',
    '*/31 * * * *', // every 31 minutes
    // '*/5 * * * * *', // every 5 seconds
    () => {
      let taskInfos = _.map(TASK_RECORD_MAP, (task, key) => {
        return key + ' -> ' + task.name;
      });

      debug(taskInfos);

      winston.info('推送任务列表： \n%s', taskInfos.join('\n'));
    }
);

/**
 * 学号定时生成
 */
schedule.scheduleJob(
    'student number generator',
    '*/1 * * * *', // 每2分钟生成
    scheduleTask.generateStudentNumber
);

/**
 * 垂死病中惊坐起
 */
schedule.scheduleJob(
    'clazz uncheckin alert',
    '30 21 * * *', // 每天21:30
    scheduleTask.pushClazzUncheckinAlert
);


/**
 * 每分钟关闭一次活动房间
 */
// schedule.scheduleJob(
//     'scheduler checker',
//     '*/1 * * * *', // every 1 minutes
//     scheduleTask.closeOpenActivityRoom
// );

/**
 * 每5分钟统计一次班级人数
 */
schedule.scheduleJob(
    'scheduler clazz account statistics',
    '*/5 * * * *', // every 5 minutes
    scheduleTask.statisticsStudentNumber
);

/**
 * 每天7点更新点赞数据
 */
schedule.scheduleJob(
    'clazz rank updater',
    '00 07 * * *', // 每天7点
    scheduleTask.updateClazzRankList
);

/**
 * 每天一点同步有学校的用户数据到mongodb
 */
schedule.scheduleJob(
  'sync user data to mongo',
  '0 1 * * *', // 每天1点
  scheduleTask.syncUser2Mongo
);
