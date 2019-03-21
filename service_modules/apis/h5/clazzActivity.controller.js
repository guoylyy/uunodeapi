/**
 * 参加友班的活动
 * 当前活动是一个机遇交友开发的
 * 目前我会对这个进行改造
 * @ 2018-10-07 改造成一个活动班级
 *
 */
'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const Promise = require('bluebird');

const enumModel = require('../../services/model/enum');
const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonError = require('../../services/model/common.error');
const commonSchema = require('../common.schema');
const clazzActivitySchema = require('./schema/clazzActivity.schema');

const systemConfig = require('../../../config/config');
const apiUtil = require('../util/api.util');

const wechatTemplateMessage = require('../../lib/wechat.template.message');
const wechatTemplateReply = require('../../lib/wechat.template.reply');

const clazzService = require('../../services/clazz.service');
const clazzActivityService = require('../../services/clazzActivity.service');
const clazzAccountService = require('../../services/clazzAccount.service');

const pub = {};

pub.getActivityIdByType = (req, res) => {
  return schemaValidator.validatePromise(clazzActivitySchema.queryActivitiesSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(res, _.get(systemConfig.ACTIVITY_CONFIG, queryParam.type, null));
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 推送助力进度消息
 *
 * @param activityId
 * @param targetUserId
 * @param targetUserItem
 * @param currentUserItem
 * @param neededFavor
 * @param currentActivityName
 */
const pushActivityFavourMessage = (activityId, targetUserId, targetUserItem, currentUserItem, neededFavor, currentActivityName) => {
  const targetPageUrl = `/activity/${ activityId }/user/${ targetUserId }`;
  const activityAlertMsg = wechatTemplateMessage.ACTIVITY_ALERT(
      targetUserItem.openId,
      `你的朋友 ${ currentUserItem.name } 给你支持了，还差${ neededFavor }个助力，快去查看吧`,
      '#Uband线上活动#',
      currentActivityName,
      '点击本消息查看进度',
      // todo 修改链接
      `${ systemConfig.BASE_URL }/redirect?target=${ encodeURIComponent(targetPageUrl) }`
  );
  wechatTemplateReply.pushTemplateMessage(activityAlertMsg, true, activityId, targetUserId);
};

/**
 * 助力成功处理
 *
 * @param currentClazzAccountId
 * @param currentActivityAccountId
 * @param targetUserItem
 * @param currentActivityName
 * @param activityId
 * @param targetUserId
 */
const activityFavourSuccessHandler = (currentClazzAccountId, currentActivityAccountId, targetUserItem, currentActivityName, activityId, targetUserId) => {
  const updateClazzAccountPromise = clazzAccountService.update(
      {
        id: currentClazzAccountId,
        status: enumModel.clazzJoinStatusEnum.PROCESSING.key
      })
      .catch((error) => {
        winston.error(error);

        winston.error('更新班级账户 %s 为 PROCESSING 失败！！！', currentClazzAccountId);
      }),
      updateActivityAccountPromise = clazzActivityService.updateActivityAccountById(
          currentActivityAccountId,
          {
            status: enumModel.activityAccountStatusEnum.PROCESSING.key
          })
          .catch((error) => {
            winston.error(error);

            winston.error('更新推广活动账户 %s 为 PROCESSING 失败！！！', currentActivityAccountId);
          });

  Promise.all([updateClazzAccountPromise, updateActivityAccountPromise])
      .then((results) => {
        debug(results);

        // 参与成功，推送消息
        const activityAlertMsg = wechatTemplateMessage.ACTIVITY_ALERT(
            targetUserItem.openId,
            `恭喜你，已经完成了助力任务，成功进入活动`,
            '#Uband线上活动#',
            currentActivityName,
            '点击进入活动主页',
            // todo 修改链接
            `${ systemConfig.BASE_URL }/course/detail/${ activityId }`
        );

        wechatTemplateReply.pushTemplateMessage(activityAlertMsg, true, activityId, targetUserId);
      });
};

/**
 * 获取班级账户基本信息
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchActivityAccountItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzActivityService.queryActivityStatistics(req.__CURRENT_CLAZZ_ACTIVITY);
      })
      .then((activityStatistics) => {
        const dummyActivityAccount = {
          id: null,
          status: enumModel.activityAccountStatusEnum.NOT_JOIN.key,
          clazzActivityRoom: null,
          version: null
        };

        const pickedActivityAccountInfo = _.isNil(req.__CURRENT_ACTIVITY_ACCOUNT)
            ? dummyActivityAccount
            : _.pick(req.__CURRENT_ACTIVITY_ACCOUNT, ['id', 'status', 'clazzActivityRoom', 'version']);

        // 增加统计结果
        pickedActivityAccountInfo.statistics = activityStatistics;

        return apiRender.renderBaseResult(res, pickedActivityAccountInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 创建活动班级账户
 *
 * @param req
 * @param res
 * @returns {Promise.<TResult>|Promise}
 */
pub.createActivityAccountItem = (req, res) => {
  return schemaValidator.validatePromise(clazzActivitySchema.createActivityAccountBodySchema, req.body)
      .then((accountInfo) => {
        debug(accountInfo);

        if (!_.isNil(req.__CURRENT_ACTIVITY_ACCOUNT)) {
          winston.error('用户 [%s] 当前用户已参加活动！！！', req.__CURRENT_USER.id);
          return Promise.reject(commonError.BIZ_FAIL_ERROR('当前用户已参加活动'));
        }

        return clazzActivityService.createActivityAccountItem(req.__CURRENT_CLAZZ_ACTIVITY, req.__CURRENT_USER, accountInfo);
      })
      .then((activityAccountItem) => {
        debug(activityAccountItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取班级活动任务列表详情
 *
 * @param req
 * @param res
 * @returns {*}
 */
pub.fetchActivityRoomInfo = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzActivityService.fetchActivityRoomById(req.__CURRENT_ACTIVITY_ACCOUNT.clazzActivityRoom, req.__CURRENT_USER.id);
      })
      .then((activityRoomItem) => {
        debug(activityRoomItem);

        activityRoomItem.partnerInfo = _.pick(activityRoomItem.partnerInfo, ['id', 'name', 'headImgUrl', 'studentNumber', 'introduction']);
        activityRoomItem.userInfo = _.pick(activityRoomItem.userInfo, ['id', 'name', 'headImgUrl', 'studentNumber', 'introduction']);

        // todo 填充聊天记录统计
        return apiRender.renderBaseResult(res, _.pick(activityRoomItem, ['status', 'userInfo', 'partnerInfo', 'recordList']))
      })
      .catch(req.__ERROR_HANDLER);
};

pub.queryActivityRoomStatistic = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzActivityService.queryRoomRecordStatistics(req.__CURRENT_ACTIVITY_ACCOUNT.clazzActivityRoom);
      })
      .then((statisticMap) => {
        debug(statisticMap);

        return apiRender.renderBaseResult(res, statisticMap);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 解散房间
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.dismissActivityRoom = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        debug(req.__CURRENT_ACTIVITY_ACCOUNT.clazzActivityRoom);

        return clazzActivityService.dismissRoomList([req.__CURRENT_ACTIVITY_ACCOUNT.clazzActivityRoom]);
      })
      .then((result) => {
        debug(result);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取所有活动列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryAllActivities = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzService.queryClazzes(enumModel.clazzStatusEnum.OPEN.key, null, null, enumModel.clazzTypeEnum.PROMOTION.key)
      })
      .then((promotionList) => {
        const pickedPromotionList = _.chain(promotionList)
            .filter('isShow')   // 过滤掉不显示的活动
            .map(apiUtil.pickActivityBasicInfo);

        return apiRender.renderBaseResult(res, pickedPromotionList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取活动详情
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchActivityDetail = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug("----param--",queryParam);

        const introductionId = req.__CURRENT_CLAZZ_ACTIVITY.introduction;

        return clazzService.fetchIntroductionById(introductionId)
      })
      .then((introductionDetail) => {
        const pickedIntroduction = {
          introduction: _.get(introductionDetail, 'introduction', null),
          requirements: _.get(introductionDetail, 'requirements', null),
          questionAnswered: _.get(introductionDetail, 'questionAnswered', null),
        };

        const pickedActivity = apiUtil.pickActivityBasicInfo(req.__CURRENT_CLAZZ_ACTIVITY);

        pickedActivity.introduction = pickedIntroduction;
        pickedActivity.joined = !_.isNil(req.__CURRENT_ACTIVITY_ACCOUNT);

        return apiRender.renderBaseResult(res, pickedActivity);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 创建活动班级账户
 *
 * @param req
 * @param res
 * @returns {Promise.<TResult>|Promise}
 */
pub.userJoinActivityItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((accountInfo) => {
        debug(accountInfo);

        const currentActivity = req.__CURRENT_CLAZZ_ACTIVITY;

        const currentUserId = req.__CURRENT_USER.id,
            activityId = currentActivity.id,
            totalFavour = _.get(currentActivity, 'activityConfig.totalFavour', 5);

        if (_.get(currentActivity, 'status') !== enumModel.clazzStatusEnum.OPEN.key) {
          winston.error('用户 [%s] 参加未开放报名的活动 [%s]！！！', currentUserId, activityId);
          return Promise.reject(commonError.BIZ_FAIL_ERROR('活动未开放报名'));
        }

        if (!_.isNil(req.__CURRENT_ACTIVITY_ACCOUNT)) {
          winston.error('用户 [%s] 已参加活动 [%s]！！！', currentUserId, activityId);
          return Promise.reject(commonError.BIZ_FAIL_ERROR('当前用户已参加活动'));
        }

        return clazzActivityService.createPureActivityAccountItem({
              userId: currentUserId,
              clazz: activityId,
              gender: _.get(req.__CURRENT_USER, 'sex', enumModel.genderEnum['0'].key)
            })
            .then((activityAccountItem) => {
              debug(activityAccountItem);

              const targetPageUrl = `/activity/${ activityId }/user/${ currentUserId }`;
              // 参加活动，推送消息
              const activityAlertMsg = wechatTemplateMessage.ACTIVITY_ALERT(
                  req.__CURRENT_USER.openId,
                  `你已经参加了活动${currentActivity.name}，需要得到 ${ totalFavour } 个朋友的支持`,
                  '#Uband线上活动#',
                  currentActivity.name,
                  '点击本消息查看进度',
                  // todo 修改链接
                  `${ systemConfig.BASE_URL }/redirect?target=${ encodeURIComponent(targetPageUrl) }`
              );
              wechatTemplateReply.pushTemplateMessage(activityAlertMsg, true, activityId, currentUserId);

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取推广活动参与进度
 *
 * @param req
 * @param res
 */
pub.fetchActivityJoinStatus = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const targetUserItem = req.__CURRENT_CLAZZ_ACTIVITY_TARGET_USER,
            currentUserId = req.__CURRENT_USER.id,
            favourList = _.get(req.__CURRENT_ACTIVITY_ACCOUNT, 'favourList', []),
            totalFavour = _.get(req.__CURRENT_CLAZZ_ACTIVITY, 'activityConfig.totalFavour', 5);

        debug(targetUserItem);
        debug(currentUserId);
        debug(favourList);

        // 是否为当前用户
        const isSelf = targetUserItem.id === currentUserId;

        // 用户基本信息
        const targetUserInfo = apiUtil.pickUserBasicInfo(targetUserItem),
            favourListSize = _.size(favourList);

        // 是否为当前用户
        targetUserInfo.isSelf = isSelf;
        /*
         是否已点赞,
         1. 如果是当前用户, 则为false
         2. 如果不是当前用户，则继续判断是否在点赞列表中
         */
        targetUserInfo.isFavour = !targetUserInfo.isSelf && _.includes(favourList, currentUserId);
        // 进度
        targetUserInfo.progressRate = _.min([1, favourListSize / totalFavour]);
        // 还差的助力
        targetUserInfo.neededFavor = _.max([0, totalFavour - favourListSize]);
        // 活动基本信息
        targetUserInfo.activityInfo = apiUtil.pickActivityBasicInfo(req.__CURRENT_CLAZZ_ACTIVITY);

        return apiRender.renderBaseResult(res, targetUserInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 推广活动为好友助力
 *
 * @param req
 * @param res
 */
pub.favourActivityAccount = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const currentUserItem = req.__CURRENT_USER,
            targetUserItem = req.__CURRENT_CLAZZ_ACTIVITY_TARGET_USER,
            currentActivityAccount = req.__CURRENT_ACTIVITY_ACCOUNT,
            currentActivity = req.__CURRENT_CLAZZ_ACTIVITY,
            currentClazzAccount = req.__CURRENT_CLAZZ_ACCOUNT_ACTIVITY;

        const currentUserId = currentUserItem.id,
            targetUserId = targetUserItem.id,
            activityId = currentActivity.id,
            currentClazzAccountId = currentClazzAccount.id,
            currentActivityAccountId = currentActivityAccount.id,
            favourList = _.get(currentActivityAccount, 'favourList', []),
            totalFavour = _.get(currentActivity, 'activityConfig.totalFavour', 5);

        debug(targetUserItem);
        debug(currentUserId);
        debug(favourList);

        // 是否为当前用户
        const isSelf = targetUserId === currentUserId;

        if (isSelf) {
          return Promise.reject(commonError.PARAMETER_ERROR('不能给自己助力'));
        }

        // 是否已助力
        const isFavoured = _.includes(favourList, currentUserId);

        if (isFavoured) {
          return Promise.reject(commonError.PARAMETER_ERROR('已经为好友助力'));
        }

        favourList.push(currentUserId);

        return clazzActivityService.updateActivityAccountById(
            currentActivityAccountId,
            {
              favourList: favourList
            })
            .then((updatedActivityAccount) => {
              debug(updatedActivityAccount);

              const neededFavor = _.max([0, totalFavour - _.size(favourList)]),
                  currentActivityName = currentActivity.name;

              // 助力成功，推送消息
              pushActivityFavourMessage(
                  activityId,
                  targetUserId,
                  targetUserItem,
                  currentUserItem,
                  neededFavor,
                  currentActivityName
              );

              // 如果所需助力为0，且班级账户或活动账户处于邀请状态
              if (neededFavor === 0 && (
                      enumModel.activityAccountStatusEnum.PENDING.key === currentActivityAccount.status ||
                      enumModel.clazzJoinStatusEnum.INVITATION.key === currentClazzAccount.status
                  )) {
                activityFavourSuccessHandler(
                    currentClazzAccountId,
                    currentActivityAccountId,
                    targetUserItem,
                    currentActivityName,
                    activityId,
                    targetUserId
                );
              }

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
