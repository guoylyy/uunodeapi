// 笃师一对一API中间键

'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('middleware');
const winston = require('winston');

const systemLog = require('../lib/system.log');

const jwtUtil = require('./util/jwt.util');

const config = require('../../config/config');
const apiErrorHandler = require('./render/api.error.handler');
const apiRender = require('./render/api.render');
const schemaValidator = require('./schema.validator');
const commonSchema = require('./common.schema');

const clazzUtil = require('../services/util/clazz.util');
const userBindUtil = require('../services/util/userBind.util');

const clazzService = require('../services/clazz.service');
const userService = require('../services/user.service');
const userBindService = require('../services/userBind.service');
const clazzAccountService = require('../services/clazzAccount.service');
const openCourseService = require('../services/openCourse.service');
const taskService = require('../services/task.service');

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

        req.__CURRENT_CLAZZ = clazzItem;
        req.__CURRENT_CLAZZ_ACCOUNT = clazzAccountItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
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
 * 解析json web token, 验证用户是否已经登录
 */
pub.parseAuthToken = (req, res, next) => {
  const loginRequired = (error) => {
    debug(error);
    winston.error('小程序用户需要重新登录！！！');
    return apiRender.renderLoginRequired(res);
  };

  debug(req.headers);
  const token = req.header('X-Auth-Token');

  if (_.isNil(token)) {
    return loginRequired();
  }

  // verifies secret and checks exp
  return jwtUtil.verify(token, config.jwt_weapp_one.secretKey, config.jwt_weapp_one.options)
      .then((userObj) => {
        debug(userObj);
        return userService.fetchById(userObj.weappUserId);
      })
      .then((userItem) => {
        // 如果用户不存在，则需登录
        if (_.isNil(userItem)) {
          return loginRequired();
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
  req.__MODULE_LOGGER = systemLog.getLogger('weapp one', req.__CURRENT_USER.id);
  next();
};

/**
 * 预装载环信第三方用户信息
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<T>}
 */
pub.preloadEasemobUserInfo = (req, res, next) => {
  debug('---------------------- preloadEasemobUserInfo ----------------------');
  const isClazzTeacher = req.__IS_CURRENT_CLAZZ_TEACHER || false;

  const easemobUsername = userBindUtil.getEasemobUsername(isClazzTeacher, req.__CURRENT_USER, req.__CURRENT_CLAZZ);

  return userBindService.fetchUserBind(enumModel.userBindTypeEnum.EASEMOB.key, easemobUsername)
      .then((userBindItem) => {
        debug(userBindItem);

        // 未注册的情况下，则先注册用户
        if (_.isNil(userBindItem)) {
          const userItem = _.extend({}, req.__CURRENT_USER, { isClazzTeacher: isClazzTeacher });

          debug(userItem);

          return userBindService.registerEasemobBindUser(req.__CURRENT_CLAZZ, userItem);
        }

        return userBindItem;
      })
      .then((userBindItem) => {
        req.__CURRENT_USER_BIND_ITEM = userBindItem;

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 为学员增加默认笃师
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.friendDefaultEasemobUser = (req, res, next) => {
  debug('---------------------- friendDefaultEasemobUser ----------------------');
  const isClazzTeacher = req.__IS_CURRENT_CLAZZ_TEACHER,
      clazzId = req.__CURRENT_CLAZZ.id,
      userBindId = req.__CURRENT_USER_BIND_ITEM.id;

  return userBindService.fetchClazzEasemobPartnerBindIdList(clazzId, req.__CURRENT_USER_BIND_ITEM.id)
      .then((partnerBindIdList) => {
        debug('friendDefaultEasemobUser partnerBindIdList: %j', partnerBindIdList);

        if (isClazzTeacher === true) {
          debug('friendDefaultEasemobUser isClazzTeacher: %s', isClazzTeacher);

          req.__CURRENT_USER_EASEMOB_PARTNER_BIND_ID_LIST = partnerBindIdList;

          return next();
        }

        const defaultEasemobUserList = _.chain(req.__CURRENT_CLAZZ).get('feedbackConfig.defaultEasemobUserList', {}).values().value();

        debug('friendDefaultEasemobUser defaultEasemobUserList: %j', defaultEasemobUserList);

        const toAddBindIdList = _.difference(defaultEasemobUserList, partnerBindIdList);

        debug('friendDefaultEasemobUser toAddBindIdList: %j', toAddBindIdList);

        return userBindService.addUserClazzEasemobPartnerList(clazzId, userBindId, toAddBindIdList)
            .then((partnerRelationList) => {
              debug(partnerRelationList);

              req.__CURRENT_USER_EASEMOB_PARTNER_BIND_ID_LIST = _.flatten([partnerBindIdList, toAddBindIdList]);

              next();
              // 返回null，避免bluebird报not returned from promise警告
              return null;
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载学员 用户 班级账户 第三方环信 信息
 * @param req
 * @param res
 * @param next
 * @returns {Promise|Promise.<TResult>}
 */
pub.preloadClazzStudentItem = (req, res, next) => {
  const studentUserId = req.params.userId;

  // 获取学员信息
  return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, studentUserId)
      .then((studentUserId) => {
        debug(studentUserId);

        return userService.fetchById(studentUserId)
            .then((studentUserItem) => {
              if (_.isNil(studentUserItem)) {
                return apiRender.renderParameterError(res);
              }

              // 判断学员是否为笃师
              const isStudentTeacher = clazzUtil.checkIsClazzTeacher(req.__CURRENT_CLAZZ)(studentUserItem.openId);

              // 如果对方为笃师，则直接报错
              if (isStudentTeacher) {
                return apiRender.renderParameterError(res, '对方为笃师');
              }

              const studentEasemobName = userBindUtil.getEasemobUsername(isStudentTeacher, studentUserItem, req.__CURRENT_CLAZZ);

              // 获取学员班级 及 环信第三方用户信息
              const fetchStudentClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(req.__CURRENT_CLAZZ.id, studentUserItem.id),
                  fetchStudentUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.EASEMOB.key, studentEasemobName);

              return Promise.all([fetchStudentClazzAccountPromise, fetchStudentUserBindPromise])
                  .then((results) => {
                    debug(results);
                    const studentClazzAccountItem = _.first(results[0]),
                        studentUserBindItem = results[1];

                    debug(studentClazzAccountItem);
                    debug(studentUserBindItem);

                    if (_.isNil(studentClazzAccountItem) || _.isNil(studentUserBindItem)) {
                      return apiRender.renderParameterError(res);
                    }

                    // 设置学员信息
                    req.__CURRENT_STUDENT_USER_ITEM = studentUserItem;
                    // 设置学员班级账户信息
                    req.__CURRENT_STUDENT_CLAZZ_ACCOUNT_ITEM = studentClazzAccountItem;
                    // 设置学员第三方环信信息
                    req.__CURRENT_STUDENT_USER_BIND_ITEM = studentUserBindItem;

                    next();
                    // 返回null，避免bluebird报not returned from promise警告
                    return null;
                  });
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载好友 第三方帐号 信息
 * @param req
 * @param res
 * @param next
 */
pub.preloadClazzEasemobFriendUserBind = (req, res, next) => {
  const friendUserBindId = req.params.userBindId;

  return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, friendUserBindId)
      .then((friendUserBindId) => {
        return userBindService.fetchEasemobUserBindById(friendUserBindId)
            .then((friendUserBindItem) => {
              if (_.isNil(friendUserBindItem)) {
                return apiRender.renderNotFound(res);
              }

              // 设置好友信息
              req.__CURRENT_EASEMOB_FRINED_USER_BIND_ITEM = friendUserBindItem;

              next();
              // 返回null，避免bluebird报not returned from promise警告
              return null;
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 检查是否已经加入默认班级，如果未加入则加入之
 * 用于微信审核
 *
 * @param req
 * @param res
 * @param next
 */
pub.checkHasAddDefaultClazz = (req, res, next) => {
  const currentUserId = req.__CURRENT_USER.id,
      clazzId = _.get(config, 'WEAPP_ONE_CONFIG.CLAZZ_ID', '592fec78f0582f3dc300ed5b');

  return clazzAccountService.queryClazzAccountByClazzId(clazzId, currentUserId)
      .then((clazzAccountList) => {
        const clazzItem = _.first(clazzAccountList);

        debug(clazzItem);

        if (_.isNil(clazzItem)) {
          return clazzAccountService.createClazzAccount({
                status: enumModel.clazzJoinStatusEnum.PROCESSING.key,
                joinDate: new Date(),
                userId: currentUserId,
                clazzId: clazzId,
              })
              .then((clazzAccountItem) => {
                debug(clazzAccountItem);

                next();
                // 返回null，避免bluebird报not returned from promise警告
                return null;
              })
        }

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 加载班级笃师信息
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadFeedbackTeacher = (req, res, next) => {
  const currentTeacherUserId = req.params.teacherUserId;

  debug(currentTeacherUserId);

  return schemaValidator.validatePromise(commonSchema.mysqlIdSchema, currentTeacherUserId)
      .then((currentTeacherUserId) => {
        return userService.fetchById(currentTeacherUserId)
            .then((clazzTeacherItem) => {
              debug(clazzTeacherItem);

              const clazzTeacherOpenId = _.get(clazzTeacherItem, 'openId');
              const teacherOpenIds = _.get(req.__CURRENT_CLAZZ, 'configuration.teacherOpenIds', []);

              debug(clazzTeacherOpenId);
              debug(teacherOpenIds);

              // 检查是否为笃师
              if (_.includes(teacherOpenIds, clazzTeacherOpenId)) {
                req.__CURRENT_CLAZZZ_TEACHER_ITEM = clazzTeacherItem;

                next();
                // 返回null，避免bluebird报not returned from promise警告
                return null;
              }

              return apiRender.renderParameterError(res, '笃师不存在');
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载公开课条目
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadOpenCourse = (req, res, next) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.openCourseId)
      .then((openCourseId) => {
        debug(openCourseId);

        return openCourseService.fetchOpenCourseItemById()
            .then((openCourseItem) => {
              debug(openCourseItem);

              if (_.isNil(openCourseItem)) {
                return apiRender.renderNotFound(res);
              }

              req.__CURRENT_OPEN_COURSE_ITEM = openCourseItem;

              next();
              // 返回null，避免bluebird报not returned from promise警告
              return null;
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预装载是否已经加入公开课
 *
 * @param req
 * @param res
 * @param next
 */
pub.preloadUserOpenCourseRelation = (req, res, next) => {
  return openCourseService.fetchUserOpenCourseRelationItem(req.__CURRENT_OPEN_COURSE_ITEM, req.__CURRENT_USER)
      .then((userOpenCourseRelation) => {
        debug(userOpenCourseRelation);

        req.__IS_USER_JOIN_OPEN_COURSE = !_.isNil(userOpenCourseRelation);

        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预加载任务
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
 * 预加载任务打卡 并校验
 */
pub.preloadTaskCheckin = (req, res, next) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.checkinId)
  .then((checkinId) => {
    return taskService.fetchCheckinById(checkinId)
    .then(checkin => {
      if (_.isNil(checkin) || !_.isEqual(checkin.taskId, req.params.taskId)) {
        return apiRender.renderNotFound(res);
      }
      req.__TASK_CHECKIN_ITEM = checkin;
      next()
      return null;
    })
  }).catch(req.__ERROR_HANDLER);
}


module.exports = pub;
