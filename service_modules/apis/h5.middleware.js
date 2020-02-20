// API中间键
'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('middleware');
const winston = require('winston');
const moment = require('moment');

const jwtUtil = require("./util/jwt.util");

const config = require('../../config/config');
const apiErrorHandler = require('./render/api.error.handler');
const apiRender = require('./render/api.render');

const systemLog = require('../lib/system.log');

const schemaValidator = require('./schema.validator');
const commonSchema = require('./common.schema');
const clazzUtil = require('../services/util/clazz.util');

const clazzService = require('../services/clazz.service');
const userService = require('../services/user.service');
const clazzAccountService = require('../services/clazzAccount.service');
const checkinService = require('../services/checkin.service');
const clazzFeedbackService = require('../services/clazzFeedback.service');
const clazzActivityService = require('../services/clazzActivity.service');
const clazzTeacherService = require('../services/clazzTeacher.service');
const promotionService = require('../services/promotion.service');

const enumModel = require('../services/model/enum');

let pub = {};

/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
pub.basicErrorHandler = (req, res, next) => {
  req.__ERROR_HANDLER = apiErrorHandler.basicErrorHandler(res);
  next();
};

/**
 * 解析json web token, 验证用户是否已经登录
 */
pub.parseAuthToken = (req, res, next) => {
  const loginRequired = (error) => {
    debug(error);
    winston.error('用户需要重新登录！！！ error: %j', error);
    return apiRender.renderLoginRequired(res);
  };

  const token = req.header('X-Auth-Token');
  const userAgent = req.header('User-Agent');

  if (_.isNil(token)) {
    return loginRequired('token不存在');
  }

  // verifies secret and checks exp
  return jwtUtil.verify(token, config.jwt.secretKey, config.jwt.options)
      .then((userObj) => {
        debug(userObj);
        return userService.fetchById(userObj.id);
      })
      .then((userItem) => {
        // 如果用户不存在，则需登录
        if (_.isNil(userItem)) {
          return loginRequired('用户不存在');
        }

        req.__CURRENT_USER = userItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(loginRequired);
};

/**
 * 模块logger
 * 定义req.__MODULE_LOGGER来处理模块日志
 *
 * 依赖于req.__CURRENT_USER
 *
 * @param req
 * @param res
 * @param next
 */
pub.moduleLogger = (req, res, next) => {
  req.__MODULE_LOGGER = systemLog.getLogger('h5', req.__CURRENT_USER.id);
  next();
};

/**
 * 预装载当前课程，如果clazzId不存在，则报404错误
 * @param req
 * @param res
 * @param next
 */
pub.preloadClazzItem = (req, res, next) => {
  const clazzId = req.params.clazzId;

  schemaValidator.validatePromise(commonSchema.mongoIdSchema, clazzId)
      .then((clazzId) => {
        debug(clazzId);
        const currentUserId = _.get(req.__CURRENT_USER, 'id', -1);

        const fetchClazzPromise = clazzService.fetchClazzById(clazzId);
        const queryClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(clazzId, currentUserId);

        return Promise.all([fetchClazzPromise, queryClazzAccountPromise]);
      })
      .then((results) => {
        const clazzItem = results[0],
            clazzAccountItem = _.first(results[1]);

        debug(clazzItem);
        debug(clazzAccountItem);

        // 如果班级不存在，则报NOT FOUND
        if (_.isNil(clazzItem)) {
          winston.error('课程 %s 不存在！！！', clazzId);
          return apiRender.renderNotFound(res);
        }

        let bindTeacherId = clazzItem.bindTeacherId;
        let bindTeacherPromise = {};
        if(!_.isNil(bindTeacherId)){
          bindTeacherPromise =  clazzTeacherService.fetchClazzTeacherById(bindTeacherId);
        }
        req.__CURRENT_CLAZZ_ACCOUNT = clazzAccountItem;
        return Promise.all([clazzItem,bindTeacherPromise]);
      })
      .then(([clazzFinalItem, clazzTeacherItem])=>{
        clazzFinalItem['bindTeacher'] =_.pick(clazzTeacherItem, ['id','name','headImgUrl','tags','description','gender'])
        req.__CURRENT_CLAZZ = clazzFinalItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 根据introductionId获取相应对象，如果不存在则报404错误
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.preloadClazzIntroductionItem = (req, res, next) => {
  if (_.isNil(req.__CURRENT_CLAZZ)) {
    winston.error('不存在__CURRENT_CLAZZ，无法加载班级简介！！！');
    return apiRender.renderParameterError(res);
  }

  clazzService.fetchIntroductionById(req.__CURRENT_CLAZZ.introduction)
      .then((introductionItem) => {
        // 如果条目不存在，则报404错误
        if (_.isNil(introductionItem)) {
          return apiRender.renderNotFound(res);
        }

        // 定义__CURRENT_CLAZZ_INTRODUCTION，预加载班级简介
        req.__CURRENT_CLAZZ_INTRODUCTION = introductionItem;
        next();
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

const clazzJoinedStatusList = [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.CLOSE.key];
/**
 * 检查用户是否已经加入课程, 并定义__IS_CURRENT_CLAZZ_TEACHER表示当前用户是否为课程笃师
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.checkHasJoinClass = (req, res, next) => {
  const currentClazz = req.__CURRENT_CLAZZ,
      currentClazzAccount = req.__CURRENT_CLAZZ_ACCOUNT;

  if (_.isNil(currentClazz)) {
    return apiRender.renderUnauthorized(res);
  }

  // 判断当前用户是否为笃师
  const isTeacher = clazzUtil.checkIsClazzTeacher(currentClazz)(req.__CURRENT_USER.openId);
  debug('isTeacher: %s', isTeacher);

  // 获取用户加入班级状态
  const joinClazzStatus = _.get(currentClazzAccount, 'status', 'NOT_JOINED_STATUS');
  /*
   1. 如果当前用户为笃师
   2. 或 已成功加入班级 (加入状态是否为 进行中， 待加入 和 已关闭)
   3. 或 用户退出的长期班
   */
  if (isTeacher === true || _.includes(clazzJoinedStatusList, joinClazzStatus)
      || (currentClazz.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key && joinClazzStatus === enumModel.clazzJoinStatusEnum.CANCELED.key)) {
    // 定义__IS_CURRENT_CLAZZ_TEACHER表示用户是否为课程笃师
    req.__IS_CURRENT_CLAZZ_TEACHER = isTeacher;

    // 如果用户处于 待确认 状态，则更新状态为进行中
    if (joinClazzStatus === enumModel.clazzJoinStatusEnum.WAITENTER.key) {
      clazzAccountService.update(
          {
            id: currentClazzAccount.id,
            status: enumModel.clazzJoinStatusEnum.PROCESSING.key
          })
          .catch((error) => {
            winston.error(error);

            winston.error('更新班级账户 %s 为 PROCESSING 失败！！！', currentClazzAccount.id);
          });
    }

    next();
    // 返回null，避免bluebird报not returned from promise警告
    return null;
  }

  // 报未授权错误
  winston.error('用户 %s 未支付课程 %s ！！！', req.__CURRENT_USER.id, currentClazz.id);
  return apiRender.renderUnauthorized(res);
};

/**
 * 预装载打卡条目信息，如果checkinId不存在，或非本人，或非当前课程则报404
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadCheckinItem = (req, res, next) => {
  let clazzId = req.params.clazzId,
      checkinId = req.params.checkinId,
      userId = req.__CURRENT_USER.id;

  schemaValidator.validatePromise(commonSchema.mongoIdSchema, checkinId)
      .then((checkinId) => {
        debug(checkinId);

        return checkinService.fetchCheckinById(checkinId);
      })
      .then((checkinItem) => {
        // 检查checkinId是否为当前用户以及当前课程的
        if (_.isNil(checkinItem) || checkinItem.userId !== userId || checkinItem.clazz !== clazzId) {
          winston.error('获取checkin对象失败！！！ checkinId: %s, clazzId: %s, userId: %s。', checkinId, clazzId, userId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CHECKIN = checkinItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 定义req.__CAN_CLAZZ_CHECKIN表示当前课程是否可打卡
 *
 * @param req
 * @param res
 * @param next
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.markCanCheckin = (req, res, next) => {
  // 判断课程当前是否可打卡
  req.__CAN_CLAZZ_CHECKIN = clazzUtil.checkCanClazzCheckin(req.__CURRENT_CLAZZ, req.__CURRENT_CLAZZ_ACCOUNT, req.__CURRENT_USER);

  return next();
};

/**
 * 检查班级是否开启了笃师一对一服务
 *
 * @param req
 * @param res
 * @param next
 */
pub.checkIsFeedbackAvailable = (req, res, next) => {
  debug(req.__CURRENT_CLAZZ);

  let hasTheOneFeedback = _.get(req.__CURRENT_CLAZZ, 'configuration.hasTheOneFeedback', false);

  if (hasTheOneFeedback !== true) {
    return apiRender.renderParameterError(res, '未开放笃师一对一功能');
  }

  return next();
};

/**
 * 必须为课程笃师，否则报未授权错误
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.mustBeClazzTeacher = (req, res, next) => {
  debug(req.__IS_CURRENT_CLAZZ_TEACHER);

  // 如果为课程笃师，则继续执行
  if (req.__IS_CURRENT_CLAZZ_TEACHER === true) {
    return next();
  }

  // 否则，报未授权
  return apiRender.renderUnauthorized(res);
};

/**
 * 定义req.__CURRENT_CLAZZ_FEEDBACK， 预装载笃师一对一反馈item
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.preloadFeedbackItem = (req, res, next) => {
  let feedbackId = req.params.feedbackId;

  debug(feedbackId);
  debug(req.__IS_CURRENT_CLAZZ_TEACHER);

  // 如果feedbackId不为空，且当前用户不是笃师；则报授权错误
  if (!_.isNil(feedbackId) && req.__IS_CURRENT_CLAZZ_TEACHER !== true) {
    return apiRender.renderUnauthorized(res);
  }

  let fetchFeedbackPromise;
  if (_.isNil(feedbackId)) {
    // 学员： 获取当前学员在该班级的反馈项目
    fetchFeedbackPromise = clazzFeedbackService.fetchClazzFeedbackByUserId(req.__CURRENT_CLAZZ.id, req.__CURRENT_USER.id);
  } else {
    // 笃师： 根据id获取班级反馈条目
    fetchFeedbackPromise = clazzFeedbackService.fetchFeedbackById(feedbackId);
  }

  return fetchFeedbackPromise.then(
      (feedbackItem) => {
        debug(feedbackItem);
        if (_.isNil(feedbackItem)) {
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ_FEEDBACK = feedbackItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 载入活动班级信息
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadClazzActivityItem = (req, res, next) => {
  const activityId = config.ACTIVITY_CONFIG.MORNING_CALL.id,
      currentUserId = req.__CURRENT_USER.id;
  const activityConfig = _.find(config.ACTIVITY_CONFIG, { id: activityId });
  const activityVersion = _.get(activityConfig, 'version', null);

  debug(activityConfig);

  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, activityId)
      .then((clazzId) => {
        debug(clazzId);
        // 获取活动信息
        const fetchClazzPromise = clazzService.fetchClazzById(clazzId);
        // 获取班级账户信息
        const queryClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(clazzId, currentUserId);
        // 获取活动账户信息
        const fetchActivityAccountPromise = clazzActivityService.fetchActivityAccountItem(
            {
              id: clazzId,
              version: activityVersion
            },
            req.__CURRENT_USER
        );

        return Promise.all([fetchClazzPromise, queryClazzAccountPromise, fetchActivityAccountPromise]);
      })
      .then((results) => {
        debug('=--------------------=');
        debug(results);

        const clazzItem = results[0],
            clazzAccountItem = _.first(results[1]),
            activityAccountItem = results[2];

        // 如果班级不存在，则报NOT FOUND
        if (_.isNil(clazzItem) ) {// || clazzItem.clazzType !== enumModel.clazzTypeEnum.PROMOTION.key) {
          winston.error('活动 %s 不存在！！！', activityId);
          return apiRender.renderNotFound(res);
        }

        // 如果未加入班级，则直接加入
        if (_.isNil(clazzAccountItem)) {
          clazzAccountService.createClazzAccount({
            status: enumModel.clazzJoinStatusEnum.INVITATION.key,
            joinDate: new Date(),
            userId: currentUserId,
            clazzId: clazzItem.id,
          })
        }

        // 设置当前活动version
        clazzItem.version = activityVersion;
        req.__CURRENT_CLAZZ_ACTIVITY = clazzItem;
        req.__CURRENT_CLAZZ_ACCOUNT_ACTIVITY = clazzAccountItem;
        req.__CURRENT_ACTIVITY_ACCOUNT = activityAccountItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 确保活动账户状态为PROCESSING
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.mustActivityAccountProcessing = (req, res, next) => {
  const currentActivityAccount = req.__CURRENT_ACTIVITY_ACCOUNT;

  if (_.isNil(currentActivityAccount)) {
    return apiRender.renderNotFound(res);
  }

  if (currentActivityAccount.status === enumModel.activityAccountStatusEnum.PROCESSING.key) {
    return void next();
  }

  return apiRender.renderParameterError(res, '当前状态不合法');
};

/**
 * 用户加入活动处理
 *
 * @param req
 * @param res
 * @param next
 * @returns {null}
 */
pub.userJoinActivity = (req, res, next) => {
  const currentClazzAccount = req.__CURRENT_CLAZZ_ACCOUNT_ACTIVITY;
  const joinClazzStatus = _.get(currentClazzAccount, 'status', 'NOT_JOINED_STATUS');

  // 如果用户处于 邀请中 状态，则更新状态为进行中
  if (joinClazzStatus === enumModel.clazzJoinStatusEnum.INVITATION.key) {
    clazzAccountService.update(
        {
          id: currentClazzAccount.id,
          status: enumModel.clazzJoinStatusEnum.PROCESSING.key
        })
        .catch((error) => {
          winston.error(error);

          winston.error('更新班级账户 %s 为 PROCESSING 失败！！！', currentClazzAccount.id);
        });
  }

  next();
  // 返回null，避免bluebird报not returned from promise警告
  return null;
};

/**
 * 活动必须为已显示的活动
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.mustBeShowedClazzActivity = (req, res, next) => {
  // 如果已配置isShow， 且不为 true，则报错
  if (_.get(req.__CURRENT_CLAZZ_ACTIVITY, 'isShow', true) !== true) {
    return apiRender.renderNotFound(res);
  }

  return next();
};

/**
 * 载入目标用户的活动班级信息
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadTargetUserClazzActivityAccountItem = (req, res, next) => {
  // 当前活动id
  const activityId = req.__CURRENT_CLAZZ_ACTIVITY.id,
      // 目标用户id
      targetUserId = req.params.userId;

  return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, targetUserId)
      .then((targetUserId) => userService.fetchById(targetUserId))
      .then((targetUser) => {
        if (_.isNil(targetUser)) {
          return apiRender.renderParameterError(res, '不存在的用户');
        }

        // 记录目标用户
        req.__CURRENT_CLAZZ_ACTIVITY_TARGET_USER = targetUser;
        const targetUserId = targetUser.id;

        // 如果当亲用户id与目标用户id相同，则无需处理
        if (req.__CURRENT_USER.id === targetUserId) {
          if (_.isNil(req.__CURRENT_CLAZZ_ACCOUNT_ACTIVITY) || _.isNil(req.__CURRENT_ACTIVITY_ACCOUNT)) {
            return apiRender.renderParameterError(res, '用户尚未参加该推广活动');
          }

          next();
          // 返回null，避免bluebird报not returned from promise警告
          return null;
        }

        const activityConfig = _.find(config.ACTIVITY_CONFIG, { id: activityId });
        debug(activityConfig);

        // 获取班级账户信息
        const queryClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(activityId, targetUserId);
        // 获取活动账户信息
        const fetchActivityAccountPromise = clazzActivityService.fetchActivityAccountItem(
            {
              id: activityId
            },
            {
              id: targetUserId
            }
        );

        return Promise.all([queryClazzAccountPromise, fetchActivityAccountPromise])
            .then((results) => {
              debug('=---------preloadClazzActivityAccountItem-----------=');
              debug(results);

              const clazzAccount = _.first(results[0]),
                  activityAccount = results[1];

              if (_.isNil(clazzAccount) || _.isNil(activityAccount)) {
                return apiRender.renderParameterError(res, '用户尚未参加该推广活动');
              }

              req.__CURRENT_CLAZZ_ACCOUNT_ACTIVITY = clazzAccount;
              req.__CURRENT_ACTIVITY_ACCOUNT = activityAccount;

              next();
              // 返回null，避免bluebird报not returned from promise警告
              return null;
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载笃师条目
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<T>}
 */
pub.preloadClazzTeacherItem = (req, res, next) => {
  const teacherId = req.params.clazzTeacherId;

  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, teacherId)
      .then((teacherId) => {
        return clazzTeacherService.fetchClazzTeacherById(teacherId);
      })
      .then((clazzTeacherItem) => {
        if (_.isNil(clazzTeacherItem)) {
          return apiRender.renderNotFound(res);
        }

        debug(clazzTeacherItem);

        req.__CURRENT_CLAZZ_TEACHER_ITEM = clazzTeacherItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户必须已经加入推广计划
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<T>}
 */
pub.userMustJoinPromotion = (req, res, next) => {
  return promotionService.fetchPromotionUserByUserId(req.__CURRENT_USER.id)
      .then((promotionUserItem) => {
        debug(promotionUserItem);

        if (_.isNil(promotionUserItem)) {
          return apiRender.renderParameterError(res, '尚未参与推广计划');
        }

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
