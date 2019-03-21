'use strict';

const _ = require('lodash');
const debug = require('debug')('util');
const moment = require('moment');

const enumModel = require('../../services/model/enum');
const clazzUtil = require('../../services/util/clazz.util');

const pub = {};

/**
 * 从clazzItem中析取出关键信息
 *
 * @param clazzItem
 * @param currentClazzAccount
 * @returns {*}
 */
pub.pickClazzBasicInfo = (clazzItem, currentClazzAccount) => {
  if (_.isNil(clazzItem)) {
    return null;
  }

  const pickedClazzItem = _.pick(clazzItem, ['id', 'name', 'clazzType', 'description', 'banner']);

  if (_.isPlainObject(currentClazzAccount)) {
    pickedClazzItem.clazzJoinStatus = _.get(currentClazzAccount, 'status', null);
  }

  return pickedClazzItem;
};

/**
 * 从userItem中析取中关键信息
 *
 * @param userItem
 * @returns {null}
 */
pub.pickUserBasicInfo = (userItem) => {
  if (_.isNil(userItem)) {
    return null;
  }

  return _.pick(userItem, ['id', 'name', 'headImgUrl', 'studentNumber']);
};

/**
 * 从adminItem中抽取出信息提供给前端显示
 *
 * @param adminItem
 * @returns {null}
 */
pub.pickAdminInfo = (adminItem) => {
  if (_.isNil(adminItem)) {
    return null;
  }

  return _.pick(adminItem, ['id', 'name', 'role', 'headImgUrl', 'phoneNumber']);
};

/**
 * 从 teacherItem 中析取除关键信息
 *
 * @param teacherItem
 * @returns {null}
 */
pub.pickClazzTeacherInfo = (teacherItem) => {
  if (_.isNil(teacherItem)) {
    return null;
  }

  return _.pick(teacherItem, ['id', 'name', 'headImgUrl', 'description', 'businessScope']);
};

/**
 * 从 notificationItem 中析取出关键信息
 * @param notificationItem
 * @returns {null}
 */
pub.pickClazzNotification = (notificationItem) => {
  if (_.isNil(notificationItem)) {
    return null;
  }

  const pickedNotificationItem = _.pick(
      notificationItem,
      ['id', 'clazzJoinStatus', 'title', 'remark', 'url', 'success', 'fail', 'pushAt']
  );

  return pickedNotificationItem;
};

/**
 * 从activityItem中析取出关键信息
 *
 * @param activityItem
 * @returns {*}
 */
pub.pickActivityBasicInfo = (activityItem) => {
  if (_.isNil(activityItem)) {
    return null;
  }

  return _.pick(activityItem, ['id', 'name', 'clazzType', 'description', 'banner', 'startDate', 'endDate', 'status']);
};

/**
 * 从 taskItem 中析取出关键信息
 *
 * @param taskItem
 * @returns {*}
 */
pub.pickClazzTaskBasicInfo = (taskItem) => {
  if (_.isNil(taskItem)) {
    return taskItem;
  }

  return _.pick(taskItem, ['id', 'title', 'stickied', 'date', 'postType', 'target', 'introductionMaterialList']);
};

/**
 * 从clazzRankItem提取关键信息
 *
 * @param clazzRankItem
 */
pub.pickClazzRankBasicInfo = (clazzRankItem) => {
  if (_.isNil(clazzRankItem)) {
    return null;
  }

  const pickedRankItem = _.pick(clazzRankItem, ['id', 'rank', 'grade', 'favourInfo']);

  pickedRankItem.userInfo = pub.pickUserBasicInfo(clazzRankItem.userInfo);

  return pickedRankItem;
};

/**
 * 从 promotionUserIncome 提取关键信息
 * @param promotionUserIncome
 * @returns {null}
 */
pub.pickPromotionUserIncomeBasicInfo = (promotionUserIncome) => {
  if (_.isNil(promotionUserIncome)) {
    return null;
  }

  const pickedInfo = _.pick(promotionUserIncome, ['id', 'promoterUserIncome', 'status']);

  const clazzInfo = promotionUserIncome.clazzInfo;
  if (!_.isNil(clazzInfo)) {
    debug(clazzInfo);

    const pickedClazzItem = pub.pickClazzBasicInfo(clazzInfo);

    pickedClazzItem.clazzJoinType = clazzUtil.getClazzJoinType(_.get(clazzInfo, ['configuration', 'clazzType'], []));
    pickedClazzItem.clazzJoinStatus = _.get(clazzInfo, 'clazzJoinStatus', enumModel.clazzJoinStatusEnum.CANCELED.key);

    pickedInfo.clazzInfo = pickedClazzItem;
  }

  return pickedInfo;
};

/**
 * 从 promotionUser 提取关键信息
 * @param promotionUser
 * @param getWechatQrCodeUrlByTicket
 * @returns {null}
 */
pub.pickPromotionUserBasicInfo = (promotionUser, getWechatQrCodeUrlByTicket) => {
  if (_.isNil(promotionUser)) {
    return null;
  }

  const pickedPromotionInfo = _.pick(promotionUser, ['id', 'key']);

  const qrcodeTicket = _.get(promotionUser, ['qrcode', 'ticket']);

  if (!_.isNil(qrcodeTicket) && _.isFunction(getWechatQrCodeUrlByTicket)) {
    pickedPromotionInfo.qrcodeUrl = getWechatQrCodeUrlByTicket(qrcodeTicket);
  }

  const userInfo = _.get(promotionUser, ['userInfo']);
  if (!_.isNil(userInfo)) {
    pickedPromotionInfo.userInfo = pub.pickUserBasicInfo(userInfo);
  }

  return pickedPromotionInfo;
};

/**
 * 从 chatItem 提取出关键信息
 *
 * @param chatItem
 * @returns {Array}
 */
pub.pickGuideChatBasicInfo = (chatItem) => {
  if (_.isNil(chatItem)) {
    return null;
  }

  const pickedChatItem = _.pick(chatItem, ['id', 'type', 'order', 'content', 'url']);

  const pickedUserInfo = pub.pickUserBasicInfo(chatItem.userInfo);
  pickedUserInfo.isSelf = _.get(chatItem, ['userInfo', 'isSelf'], false);

  pickedChatItem.userInfo = pickedUserInfo;

  return pickedChatItem;
};

pub.pickClazzPlayBasicInfo = (clazzPlayItem) => {
  if (_.isNil(clazzPlayItem)) {
    return null;
  }

  return _.pick(clazzPlayItem, ['id', 'title', 'targetDate', 'fileSize', 'sections', 'updatedAt']);
};

/**
 * 从 clazzCheckinItem 中抽取基本信息
 *
 * @param clazzCheckinItem
 * @returns {null}
 */
pub.pickClazzLuckyCheckinBasicInfo = (clazzCheckinItem) => {
  if (_.isNil(clazzCheckinItem)) {
    return null;
  }

  return _.pick(clazzCheckinItem, ['id', 'date', 'luckyNumber']);
};

/**
 * 抽取打卡详情信息
 *
 * @param checkinItem
 * @param checkinEndHour
 * @returns {null}
 */
pub.pickCheckinInfo = (checkinItem, checkinEndHour) => {
  if (_.isNil(checkinItem)) {
    return null;
  }

  const pickedCheckin = _.pick(checkinItem, ['id', 'status']);

  if (_.isNumber(checkinEndHour)) {
    const diffHour = checkinEndHour - 24;
    const checkinMoment = moment(checkinItem.checkinTime),
        checkinEndMoment = moment(checkinItem.checkinTime).endOf("day").add(diffHour, 'hours');

    // 计算提前打卡时间 秒数
    pickedCheckin.aheadSeconds = checkinEndMoment.diff(checkinMoment, 'seconds');
  }

  // 用户基本信息
  const checkinUser = checkinItem.user;
  if (!_.isNil(checkinUser)) {
    pickedCheckin.userInfo = pub.pickUserBasicInfo(checkinUser);
  }

  return pickedCheckin;
};

pub.pickUserRank = (userRankItem) => {
  if (_.isNil(userRankItem)) {
    return null;
  }

  userRankItem.userInfo = pub.pickUserBasicInfo(userRankItem.userInfo);

  return _.pick(userRankItem, ['id', 'userInfo', 'rank', 'value']);
};

module.exports = pub;
