'use strict';

const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('util');

const systemConfig = require('../../../config/config');
const enumModel = require('../model/enum');

let pub = {};

/**
 * 规范化任务开始的基准日期
 * 学期班, 长期班，推广班：baseMoment = clazzStartDate - 1 day
 * 非学期班：
 *   userJoinDate < clazzStartDate  : baseMoment = clazzStartDate - 1 day
 *   userJoinDate >= clazzStartDate :
 *    userJoinDate.hour < 12  : baseMoment = userJoinDate
 *    userJoinDate.hour >= 12 : baseMoment = userJoinDate + 1day
 * @param clazzStartDate
 * @param userJoinDate
 * @param clazzType
 * @returns {*}
 */
pub.calculateTaskBaseMoment = (clazzStartDate, userJoinDate, clazzType) => {
  let joinMoment;

  //如果不是非学期班，什么时候进入无所谓了，都是学期开始时候进入
  if ((clazzType && clazzType !== enumModel.clazzTypeEnum.LTS.key) || (userJoinDate < clazzStartDate)) {
    //这一部分用户当作默认推第一天
    joinMoment = moment(clazzStartDate).subtract(1, 'days');
  } else {
    joinMoment = moment(userJoinDate);
  }

  //如果join在12点之后， 则第二天为开始日期
  if (joinMoment.hour() >= 12) {
    joinMoment = joinMoment.add(1, 'days');
  }

  // 将日期调整为当天0点，避免计算错误
  return joinMoment.startOf('day');
};

/**
 * 计算用户当前的任务天数
 * @param clazzStartDate    班级开班日期  必填
 * @param userJoinDate      用户加班日期  必填
 * @param clazzType         班级类型      非必填
 * @param relativeDate      相对计算日期  非必填，默认为当天
 * @returns {*}
 */
pub.calculateClazzDayNumber = (clazzStartDate, userJoinDate, clazzType, relativeDate) => {
  let currentMoment;

  if (relativeDate) {
    currentMoment = moment(relativeDate).startOf('day');
  } else {
    currentMoment = moment().startOf('day');
  }

  return currentMoment.diff(pub.calculateTaskBaseMoment(clazzStartDate, userJoinDate, clazzType), 'days');
};

/**
 * 判断当前课程是否能打卡
 *
 * @param clazzItem         班级条目
 * @param clazzAccountItem  班级账户条目
 * @param userItem          用户条目
 * @returns {boolean}
 */
pub.checkCanClazzCheckin = (clazzItem, clazzAccountItem, userItem) => {
  const yesterdayDate = moment().add(-1, 'day').toDate();

  const clazzStartDate = _.get(clazzItem, 'startDate', yesterdayDate),                  // 课程开始日期
      clazzEndDate = _.get(clazzItem, 'endDate', yesterdayDate),                        // 课程结束日期
      clazzType = _.get(clazzItem, 'clazzType', enumModel.clazzTypeEnum.SEMESTER.key),  // 课程类型
      userJoinDate = _.get(clazzAccountItem, 'joinDate', new Date()),                   // 用户加班日期
      checkinStartHour = _.get(clazzItem, 'configuration.startHour', 0),                // 班级打卡开始小时
      checkinEndHour = _.get(clazzItem, 'configuration.endHour', 0),                    // 班级打卡结束小时
      userClazzEndDate = _.get(clazzAccountItem, 'endDate', yesterdayDate),
      // 用户时区枚举
      userTimeZoneEnum = enumModel.getEnumByKey(_.get(userItem, 'timezone'), enumModel.timezoneEnum);

  debug('---------checkCanClazzCheckin------------');
  debug(clazzStartDate);
  debug(clazzEndDate);
  debug(clazzType);
  debug(userJoinDate);
  debug(checkinStartHour);
  debug(checkinEndHour);
  debug(userTimeZoneEnum);
  debug('---------checkCanClazzCheckin------------');

  const clazzDayNumber = pub.calculateClazzDayNumber(clazzStartDate, userJoinDate, clazzType),
      clazzDays = moment(clazzEndDate).diff(clazzStartDate, 'days') + 1, // +1 是为了保证班级天数的计算正确
      nowMoment = moment();

  // 设置时区
  if (userTimeZoneEnum != null) {
    nowMoment.utcOffset(userTimeZoneEnum.timezone)
  }

  const nowHour = nowMoment.hour();

  debug(clazzDayNumber);
  debug(clazzDays);
  debug(nowHour);

  /*
   学员当前是否在开班时间内
   长期运营班 判断 当前时间收否在结班日期前
   其他班    判断  当前是否在课程天数以内
   */
  const isWithinClazzDateRange = clazzType === enumModel.clazzTypeEnum.LONG_TERM.key
      ? moment().isSameOrBefore(userClazzEndDate, 'day')
      : clazzDayNumber <= clazzDays;

  if (isWithinClazzDateRange === true) {
    if (nowHour >= checkinStartHour) {  // 当前小时 大于 开始打卡小时
      return nowHour < checkinEndHour;
    } else if (nowHour + 24 < checkinEndHour) { // 当前小时+24 小于 打卡结束小时
      return true;
    }
  }

  return false;
};

/**
 * 判断用户是否为课程笃师
 * 返回一个接收用户openId的函数
 *
 * @param clazzItem
 * @returns {function(*=)}
 */
pub.checkIsClazzTeacher = (clazzItem) => {
  debug(clazzItem);

  const teacherOpenIdList = _.get(clazzItem, 'configuration.teacherOpenIds', []);
  debug(teacherOpenIdList);

  return (userOpenId) => {
    debug(userOpenId);
    return _.includes(teacherOpenIdList, userOpenId);
  };
};

/**
 * 根据班级类型计算开班时间及结班时间
 *
 * @param clazzStartDate
 * @param clazzEndDate
 * @param clazzType
 * @param userJoinDate
 * @returns {{startDate: (Date|*), endDate: (Date|*)}}
 */
pub.calculateClazzStartEndDate = (clazzStartDate, clazzEndDate, clazzType, userJoinDate) => {
  let clazzDays = moment(clazzEndDate).diff(clazzStartDate, 'days'),
      clazzStartMoment = pub.calculateTaskBaseMoment(clazzStartDate, userJoinDate, clazzType).add(1, 'days');

  debug(clazzDays);

  let startDate = moment(clazzStartMoment).startOf('day').toDate(),
      endDate = moment(clazzStartMoment).add(clazzDays, 'days').endOf('day').toDate();

  debug(startDate);
  debug(endDate);

  return {
    startDate: startDate,
    endDate: endDate
  };
};

/**
 * 根据课程配置中的clazzType获取班级加入方式
 *
 * @param clazzType   clazz.configuration.clazzType
 * @returns {*}
 */
pub.getClazzJoinType = (clazzType) => {
  /*
   1. 如果配置的班级类型中含有 PAY， 则为付费班
   2. 如果 含有 FREE, 则为免费班
   3. 其他情况都为 笃金班
   */
  if (_.includes(clazzType, enumModel.clazzJoinTypeEnum.PAY.key)) {
    return enumModel.clazzJoinTypeEnum.PAY.key;
  } else if (_.includes(clazzType, enumModel.clazzJoinTypeEnum.FREE.key)) {
    return enumModel.clazzJoinTypeEnum.FREE.key;
  } else {
    return enumModel.clazzJoinTypeEnum.GAMBITION_COIN.key;
  }
};

/**
 * 课程任务url生成器
 * @type {Function}
 */
// const compiledTaskUrlTemplate = _.template(systemConfig.BASE_URL + '/course/${ courseId }/task/${ taskId }?postId=${ postId }');
const compiledTaskUrlTemplate = _.template(systemConfig.BASE_URL + '/study#/studyDetail?classId=${ courseId }&taskId=${ taskId }');

/**
 * 获取课程任务推文链接
 *
 * @param clazzId
 * @param taskId
 * @param postId
 * @returns {*}
 */
pub.getClazzTaskUrl = (clazzId, taskId, postId) => {
  return compiledTaskUrlTemplate({
    courseId: clazzId,
    taskId: taskId,
    postId: postId
  })
};

/**
 * 班级主页Url template
 * @type {Function}
 */
const compiledClazzDetailUrlTemplate = _.template(systemConfig.BASE_URL + '/study#/studyList?id=${ clazzId }');

/**
 * 获取clazzId所对应的班级主页
 *
 * @param clazzId
 */
pub.getClazzMainPageUrl = (clazzId) => {
  return compiledClazzDetailUrlTemplate({
    clazzId: clazzId
  });
};

/**
 * 检查日期是否在学员购买课程日期内
 *
 * @param checkDate
 * @param clazzAccountRecordList
 * @returns {boolean}
 */
pub.checkDateIsWithinClazzRange = (checkDate, clazzAccountRecordList) => {
  for (const clazzAccountRecord of clazzAccountRecordList) {
    if (moment(checkDate).isBetween(
            clazzAccountRecord.startDate,
            clazzAccountRecord.endDate,
            'day',
            '[]'
        )
    ) {
      return true;
    }
  }

  return false;
};

/**
 * 从班级配置中析取出价格列表
 */
pub.extractClazzPriceList = (clazzItem) => {
// 获取课程费用
  return clazzItem.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key
      // 长期班获取价格配置列表
      ? clazzItem.configuration.priceList || []
      // 非长期班则直接取原本配置，默认月份数为1
      : [_.chain(clazzItem.configuration).pick(['totalFee', 'originFee']).extend({ months: 1, name: 'ONE_MONTH' }).value()];
};

/**
 * 检查是否应当在课程列表中显示课程
 *
 * @param clazzItem
 * @param clazzAccountStatus
 * @returns {boolean}
 */
pub.checkIsClazzShowForAccount = (clazzItem, clazzAccountStatus) => {
  const isNotCanceledNormalClazz = clazzItem.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key
      || clazzAccountStatus !== enumModel.clazzJoinStatusEnum.CANCELED.key;
  // const isShow = _.get(clazzItem, 'isShow', true);

  return isNotCanceledNormalClazz;// && isShow;
};

/**
 * 检查课程是否显示
 *
 * @param clazzItem
 * @returns {boolean}
 */
pub.checkIsClazzShow = (clazzItem) => {
  return _.get(clazzItem, 'isShow', true) === true;
};


/**
 * 检查课程是否是 hot 课程
 *
 * @param clazzItem
 * @returns {boolean}
 */
pub.checkIsClazzHot = (clazzItem) => {
  return _.get(clazzItem, 'isHot', false) === true;
};

/**
 * 检查是否应当在课程列表中显示课程
 *
 * @param clazzItem
 * @param clazzAccountStatus
 * @returns {boolean}
 */
pub.checkIsClazzShowInWeappOne = (clazzItem, clazzAccountStatus) => {
  return clazzItem.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key
      || clazzAccountStatus !== enumModel.clazzJoinStatusEnum.CANCELED.key;
};

/**
 * 填充打卡列表中的用户数据
 *
 * @param checkinList
 * @param userList
 * @returns {Array}
 */
pub.fillCheckinWithUser = (checkinList, userList) => {
  const userMap = _.keyBy(userList, 'id');

  return _.map(
      checkinList,
      (checkinItem) => {
        checkinItem.user = userMap[checkinItem.userId];

        return _.omit(checkinItem, 'userId', 'user.openId', 'clazz', 'user.clazzAccount');
      });
};

pub.getClazzTaskCount = (clazzItem) => _.get(clazzItem, ['configuration', 'taskCount'], 28);

module.exports = pub;
