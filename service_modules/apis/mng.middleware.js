// API中间键
'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('middleware');
const winston = require('winston');
const moment = require('moment');

const systemLog = require('../lib/system.log');

const jwtUtil = require('./util/jwt.util');

const systemConfig = require('../../config/config');
const apiErrorHandler = require('./render/api.error.handler');
const apiRender = require('./render/api.render');

const schemaValidator = require('./schema.validator');
const commonSchema = require('./common.schema');

const clazzService = require('../services/clazz.service');
const adminService = require('../services/admin.service');
const clazzAccountService = require('../services/clazzAccount.service');
const checkinService = require('../services/checkin.service');
const clazzTaskService = require('../services/clazzTask.service');
const clazzFeedbackService = require('../services/clazzFeedback.service');
const clazzFeedbackMaterialService = require('../services/clazzFeedbackMaterial.service');
const clazzPlayService = require('../services/clazzRolePlay.service');
const userScoreService = require('../services/userScore.service');
const userService = require('../services/user.service');
const couponService = require('../services/coupon.service');
const userWithdrawService = require('../services/userWithdraw.service');
const clazzExitService = require('../services/clazzExit.servie');
const taskService = require('../services/task.service');
const lessonService = require('../services/lesson.service');

const enumModel = require('../services/model/enum');

const pub = {};

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
    winston.error('管理员需要重新登录！！！');
    return apiRender.renderLoginRequired(res);
  };

  const token = req.header('X-Auth-Token');

  if (_.isNil(token)) {
    return loginRequired();
  }

  // verifies secret and checks exp
  return jwtUtil.verify(token, systemConfig.jwt_mng.secretKey, systemConfig.jwt_mng.options)
      .then((adminObj) => {
        return adminService.fetchAdminById(adminObj.adminId);
      })
      .then((adminItem) => {
        debug(adminItem);
        // 1. 如果管理员不存在
        // 2. token不一致
        // 3. token已过期
        // 则需登录
        if (_.isNil(adminItem) || adminItem.authToken !== token || moment().isAfter(adminItem.authExpire)) {
          throw new Error('admin login required');
        }

        req.__CURRENT_ADMIN = adminItem;

        return adminService.fetchAdminPermissions(adminItem.id);
      })
      .then((permissions) => {
        debug(permissions);

        // 设置权限
        req.__CURRENT_ADMIN.permissions = permissions;
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
  req.__MODULE_LOGGER = systemLog.getLogger('mng', req.__CURRENT_ADMIN.id);
  next();
};

/**
 * 预装载当前课程，如果clazzId不存在，则报404错误
 * @param req
 * @param res
 * @param next
 */
pub.preloadClazzItem = (req, res, next) => {
  let clazzId = req.params.clazzId;

  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, clazzId)
      .then((clazzId) => {
        debug(clazzId);

        return clazzService.fetchClazzById(clazzId);
      })
      .then((clazzItem) => {
        // 如果班级不存在，则报NOT FOUND
        if (_.isNil(clazzItem)) {
          winston.error('班级 %s 不存在！！！', clazzId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ = clazzItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 检查班级权限
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.checkClazzPermission = (req, res, next) => {
  let clazzId = req.params.clazzId;

  if (_.isNil(req.__CURRENT_ADMIN.permissions[enumModel.permissionTypeEnum.CLAZZ_PERMISSION.key][clazzId])) {
    winston.error('管理员 %s 访问未授权的班级 %s', req.__CURRENT_ADMIN.id, clazzId);
    return apiRender.renderUnauthorized(res);
  }

  return next();
};

/**
 * 预加载学员clazz account记录
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadClazzStudentItem = (req, res, next) => {
  let clazzId = req.params.clazzId,
      clazzAccountId = req.params.accountId;

  clazzAccountService.fetchClazzAccountById(clazzAccountId)
      .then((clazzAccountItem) => {
        debug(clazzAccountItem);
        // 如果学员不在该班级
        if (_.isNil(clazzAccountItem) || clazzAccountItem.clazzId !== clazzId) {
          winston.error('clazz account %s 不存在！！！', clazzAccountId);
          return apiRender.renderParameterError(res, '学员不在班级内');
        }

        req.__CURRENT_STUDENT_CLAZZ_ACCOUNT = clazzAccountItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载班级打卡信息
 * 定义req.__CURRENT_STUDENT_CHECKIN_ITEM
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadClazzChecinItem = (req, res, next) => {
  const clazzId = req.params.clazzId,
      checkinId = req.params.checkinId;

  return checkinService.fetchCheckinById(checkinId)
      .then((checkItem) => {
        debug(checkItem);

        if (_.isNil(checkItem) || checkItem.clazz !== clazzId) {
          winston.error('checkin %s 不存在！！！', checkinId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_STUDENT_CHECKIN_ITEM = checkItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
};

/**
 * 预装载课程任务
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<T>|Promise}
 */
pub.preloadTaskItem = (req, res, next) => {
  let taskId = req.params.taskId;

  return clazzTaskService.fetchClazzTaskById(taskId, req.__CURRENT_CLAZZ.id)
      .then((taskItem) => {
        debug(taskItem);

        if (_.isNil(taskItem)) {
          winston.error('clazz task %s 不存在！！！', taskId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ_TASK = taskItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);

};

/**
 * 预装载笃师一对一反馈素材
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<T>}
 */
pub.preloadFeedbackMaterialItem = (req, res, next) => {
  let materialId = req.params.materialId;

  return clazzFeedbackMaterialService.fetchFeedbackMaterialById(materialId)
      .then((materialItem) => {
        debug(materialItem);

        if (_.isNil(materialItem) || materialItem.clazz !== req.__CURRENT_CLAZZ.id || materialItem.isDelete === true) {
          winston.error('笃师一对一素材 %s 不存在！！！', materialId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ_FEEDBACK_MATERIAL = materialItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 确保课程为长期班
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.mustBeLongtermClazz = (req, res, next) => {
  const currentClazzType = _.get(req.__CURRENT_CLAZZ, 'clazzType', null);

  if (currentClazzType !== enumModel.clazzTypeEnum.LONG_TERM.key) {
    return apiRender.renderParameterError(res, '课程类型必须为长期班');
  }

  next();
  // 返回null，避免bluebird报not returned from promise警告
  return null;
};

/**
 * 预加载长期班账户记录列表
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<T>|Promise}
 */
pub.preloadLongtermClazzRecordList = (req, res, next) => {
  return clazzAccountService.queryClazzAccountRecords(req.__CURRENT_STUDENT_CLAZZ_ACCOUNT)
      .then((recordList) => {
        debug(recordList);

        req.__CURRENT_STUDENT_CLAZZ_ACCOUNT_RECORD_LIST = recordList;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载对话体详情
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<T>}
 */
pub.preloadClazzPlay = (req, res, next) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.playId)
      .then((playId) => {
        return clazzPlayService.fetchClazzPlayById(req.__CURRENT_CLAZZ.id, playId);
      })
      .then((playItem) => {
        debug(playItem);

        req.__CURRENT_CLAZZ_ROLE_PLAY_ITEM = playItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载班级大点评
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<T>|Promise}
 */
pub.preloadClazzFeedbackItem = (req, res, next) => {
  const { clazzId, feedbackId } = req.params;

  debug(feedbackId);

  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, feedbackId)
      .then((feedbackId) => {
        debug(feedbackId);

        return clazzFeedbackService.fetchFeedbackById(feedbackId);
      })
      .then((clazzFeedbackItem) => {
        debug(clazzFeedbackItem);

        if (_.isNil(clazzFeedbackItem) || clazzFeedbackItem.clazz !== clazzId) {
          winston.error('班级大点评 %s 不存在！！！', feedbackId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ_FEEDBACK = clazzFeedbackItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载用户积分信息
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<T>|Promise}
 */
pub.preloadClazzUserScoreItem = (req, res, next) => {
  const { clazzId, userScoreId } = req.params;

  return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, userScoreId)
      .then((userScoreId) => {
        debug(userScoreId);

        return userScoreService.fetchScoreRecordById(userScoreId);
      })
      .then((userScoreItem) => {
        debug(userScoreItem);

        if (_.isNil(userScoreItem) || userScoreItem.clazzId !== clazzId) {
          winston.error('用户积分记录 %s 不存在！！！', userScoreId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ_USER_SCORE = userScoreItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载管理员条目
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadAdminItem = (req, res, next) => {
  const adminId = req.params.adminId;

  return adminService.fetchAdminById(adminId)
      .then((adminItem) => {
        debug(adminItem);

        if (_.isNil(adminItem)) {
          return apiRender.renderNotFound(res);
        }

        // 设置当前要操作的管理员帐号
        req.__CURRENT_TARGET_ADMIN_ITEM = adminItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载退款用户信息
 *    必须在 preloadWitdrawItem 之后使用
 * @param req
 * @param res
 * @param next
 */
pub.preloadWithdrawUserItem = (req, res, next) => {
  userService.fetchById(req.__CURRENT_USER_WITHDRAW_ITEM.userId)
      .then((userItem) => {
        debug(userItem);

        req.__CURRENT_USER_WITHDRAW_USER_ITEM = userItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载用户提现信息，如果不存在，则报404错误
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadWitdrawItem = (req, res, next) => {
  const withdrawId = req.params.withdrawId;

  debug(withdrawId);

  schemaValidator.validatePromise(commonSchema.mysqlIdSchema, withdrawId)
      .then((withdrawId) => {
        return userWithdrawService.fetchUserWithdrawInfoById(withdrawId);
      })
      .then((withdrawIdItem) => {
        debug(withdrawIdItem);

        // 如果用户退款存在，则报NOT FOUND
        if (_.isNil(withdrawIdItem)) {
          winston.error('用户退款 %s 不存在！！！', withdrawId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_USER_WITHDRAW_ITEM = withdrawIdItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载优惠券信息，如果不存在，则报404错误
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadCouponItem = (req, res, next) => {
  const couponId = req.params.couponId;

  debug(couponId);

  schemaValidator.validatePromise(commonSchema.mysqlIdSchema, couponId)
      .then((couponId) => {
        return couponService.fetchCouponById(couponId);
      })
      .then((couponItem) => {
        debug(couponItem);

        // 如果优惠券不存在，则报NOT FOUND
        if (_.isNil(couponItem)) {
          winston.error('优惠券 %s 不存在！！！', couponId);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_COUPON_ITEM = couponItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载退班申请
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<T>}
 */
pub.preloadClazzExitItem = (req, res, next) => {
  const clazzExitId = req.params.clazzExitId;

  debug(clazzExitId);

  return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, clazzExitId)
      .then((clazzExitId) => {
        return clazzExitService.fetchClazzExitById(clazzExitId);
      })
      .then((clazzExitItem) => {
        debug(clazzExitItem);

        if (_.isNil(clazzExitItem)) {
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CLAZZ_EXIT_ITEM = clazzExitItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载学员条目
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadUserItem = (req, res, next) => {
  let userId = req.params.userId;

  debug(userId);

  userService.fetchById(userId)
      .then((userItem) => {
        debug(userItem);

        if (_.isNil(userItem)) {
          winston.error('用户 %s 不存在！！！', userId);
          return apiRender.renderNotFound(res);
        }

        // 当前学员
        req.__CURRENT_USER_ITEM = userItem;

        next();

        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 * 预加载weapp课程任务
 */
pub.preloadTask = (req, res, next) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.taskId)
  .then((taskId) => {
    return taskService.fetchById(taskId)
    .then(task => {
      if (_.isNil(task)) {
        return apiRender.renderNotFound(res);
      }
      req.__TASK_ITEM = task;
      next()
      return null;
    })
  }).catch(req.__ERROR_HANDLER);
}

/**
 * 预加载weapp文章
 */
pub.preloadLesson = (req, res, next) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.lessonId)
  .then((lessonId) => {
    return lessonService.fetchById(lessonId)
    .then(lesson => {
      if (_.isNil(lesson)) {
        return apiRender.renderNotFound(res);
      }
      req.__LESSON_ITEM = task;
      next()
      return null;
    })
  }).catch(req.__ERROR_HANDLER);
}


module.exports = pub;
