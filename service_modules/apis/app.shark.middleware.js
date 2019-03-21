// API中间键
'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('middleware');
const winston = require('winston');

const jwtUtil = require('./util/jwt.util');

const systemConfig = require('../../config/config');
const apiErrorHandler = require('./render/api.error.handler');
const apiRender = require('./render/api.render');

const systemLog = require('../lib/system.log');

const schemaValidator = require('./schema.validator');
const commonSchema = require('./common.schema');

const userService = require('../services/user.service');
const checkinService = require('../services/checkin.service');
const luckyCheckinService = require('../services/clazzLuckyCheckin.service');
const clazzAccountService = require('../services/clazzAccount.service');

const enumModel = require('../services/model/enum');

const accountUtil = require('../services/util/account.util');

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
    winston.error('shark app用户需要重新登录！！！ error: %j', error);
    return apiRender.renderLoginRequired(res);
  };

  const token = req.header('X-Auth-Token');

  if (_.isNil(token)) {
    return loginRequired('token不存在');
  }

  // verifies secret and checks exp
  return jwtUtil.verify(token, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options)
      .then((userObj) => {
        debug(userObj);
        return userService.fetchById(userObj.appUserId);
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
  req.__MODULE_LOGGER = systemLog.getLogger('shark app', req.__CURRENT_USER.id);
  next();
};

/**
 * 自动生成学号
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<TResult>|Promise}
 */
pub.autoGenerateStudentNumber = (req, res, next) => {
  const currentAccount = req.__CURRENT_USER;

  if (_.isEmpty(currentAccount.studentNumber)) {
    // 先获取当前最大学号，构造学号生成函数
    return userService.fetchMaxStudentNumber()
        .then((maxStudentNumber) => {
          debug(maxStudentNumber);

          return accountUtil.calculateNextStudentNumber(maxStudentNumber);
        })
        .then((nextStudentNumber) => {
          const studentNumber = nextStudentNumber();
          debug(studentNumber);

          return userService.updateUserItem(currentAccount.id, { studentNumber: studentNumber });
        })
        .then((updatedStudent) => {
          debug(updatedStudent);

          req.__CURRENT_USER = updatedStudent;
          next();
          // 返回null，避免bluebird报not returned from promise警告
          return null;
        })
        .catch(req.__ERROR_HANDLER);
  }

  next();
};

/**
 * 默认加入介绍班
 *
 * @param req
 * @param res
 * @param next
 */
pub.autoJoinIntroductionClazzItem = (req, res, next) => {
  const currentUserId = req.__CURRENT_USER.id,
      clazzId = _.get(systemConfig, ['APP_RELEASE_CONFIG', 'introductionClazzId']);

  return clazzAccountService.queryClazzAccountByClazzId(clazzId, currentUserId)
      .then((clazzAccountList) => {
        const clazzAccountItem = _.first(clazzAccountList);

        debug(clazzAccountItem);

        if (_.isNil(clazzAccountItem)) {
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
 * 预加载抽打卡详情信息
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<TResult>|Promise}
 */
pub.preloadLuckyCheckinItem = (req, res, next) => {
  const { clazzId, luckyCheckinId, checkinId } = req.params;

  const fetchLuckyCheckinPromise = schemaValidator.validatePromise(commonSchema.mongoIdSchema, luckyCheckinId)
      .then((luckyCheckinId) => {
        debug(luckyCheckinId);

        return luckyCheckinService.fetchLuckyCheckinById(luckyCheckinId);
      });

  const fetchCheckinItem = schemaValidator.validatePromise(commonSchema.mongoIdSchema, checkinId)
      .then((checkinId) => {
        debug(checkinId);

        return checkinService.fetchCheckinById(checkinId);
      });

  return Promise.all([fetchLuckyCheckinPromise, fetchCheckinItem])
      .then(([clazzLuckyCheckinItem, checkinItem]) => {
        debug(clazzLuckyCheckinItem);
        debug(checkinItem);

        if (_.isNil(clazzLuckyCheckinItem) || _.isNil(checkinItem) ||
            clazzLuckyCheckinItem.clazz !== clazzId || checkinItem.clazz !== clazzId ||
            !_.includes(clazzLuckyCheckinItem.checkins, checkinItem.id)
        ) {
          winston.error('获取抽打卡详情失败！！！ clazzId: %s, luckyCheckinId: %s, checkinId: %s, userId: %s。', clazzId, luckyCheckinId, checkinId, req.__CURRENT_USER.id);
          return apiRender.renderNotFound(res);
        }

        req.__CURRENT_CHECKIN = checkinItem;
        next();
        // 返回null，避免bluebird报not returned from promise警告
        return null;
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
