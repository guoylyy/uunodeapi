'use strict';

/**
 * 用户相关API
 */

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const accountSchema = require('./schema/account.schema');

const userService = require('../../services/user.service');
const userConfigService = require('../../services/userConfig.service');
const userLikeService = require('../../services/userLike.service');

const enumModel = require('../../services/model/enum');

const pub = {};

/**
 * 检查token是否有效
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.checkAuth = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: GET /account
 * 获取个人信息，由于API相关信息已经存在于req.__CURRENT_USER 中，所以直接获取，不查询数据库
 *
 * @param req
 * @param res
 * @returns {*}
 */
pub.getAccountBaseInfo = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const currentUser = req.__CURRENT_USER;

        //筛选需要的属性
        const pickedUserInfo = _.pick(currentUser, ['id', 'name', 'headImgUrl', 'sex', 'school', 'certification', 'studentNumber', 'birthday']);
        // 处理已设置别名的情况
        const realName = _.get(currentUser, ['realName']);
        if (!_.isNil(realName) && realName !== '') {
          pickedUserInfo.name = realName;
        }
        // 处理生日日期
        if (pickedUserInfo.birthday) {
          pickedUserInfo.birthday = moment(pickedUserInfo.birthday).format('YYYY-MM-DD');
        }

        return apiRender.renderBaseResult(res, pickedUserInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新用户基本信息
 *
 * @param req
 * @param res
 */
pub.updateAccountInfo = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userInfoUpdateSchema, req.body)
      .then((baseInfo) => {
        debug(baseInfo);

        req.__MODULE_LOGGER('更新用户基本信息', baseInfo);

        return userService.updateUserItem(req.__CURRENT_USER.id, baseInfo);
      })
      .then((userItem) => {
        debug(userItem);
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新个人学校
 */
pub.updateAccountSchool = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userUpdateSchoolSchema, req.body)
      .then((baseInfo) => {
        req.__MODULE_LOGGER('更新用户学校', baseInfo);
        return userService.updateUserItem(req.__CURRENT_USER.id, baseInfo);
      })
      .then((userItem) => {
        debug(userItem);
        return apiRender.renderSuccess(res);
      }).catch(req.__ERROR_HANDLER);
};

/**
 * 更新个人证书
 */
pub.updateAccountCertifications = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userUpdateCertificationSchema, req.body)
      .then((baseInfo) => {
        debug(baseInfo);
        let crts = baseInfo.certifications;
        if (crts.length > 0) {
          let crtStr = _.join(crts, ",");
          return userService.updateUserItem(req.__CURRENT_USER.id, {'certification': crtStr});
        } else {
          return apiRender.renderBizFail(res);
        }
      })
      .then((userItem) => {
        debug(userItem);
        return apiRender.renderSuccess(res);
      }).catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户配置信息
 *  - 如果没有用户配置信息，就给用户设置一个配置
 */
pub.fetchUserPersonConfiguration = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((info) => {
        debug(info);
        return userConfigService.queryUserConfigByApp(req.__CURRENT_USER.id, req.params['configApp']);
      }).then((items) => {
        debug(items);
        return apiRender.renderBaseResult(res, items);
      }).catch(req.__ERROR_HANDLER);
};

/**
 * 更新用户配置信息
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.updateUserPersonConfiguration = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userConfigUpdateSchema, req.body)
      .then((params) => {
        //如果没有ID
        return userConfigService.queryUserConfigByType(req.__CURRENT_USER, req.params['configApp'], params.key);
      }).then((configs) => {
        if (configs.length == 1) {
          let item = configs[0];
          item.configValue = req.body.value;
          return userConfigService.updateUserConfig
          Value(item);
        } else if (configs.length == 0) {
          return userConfigService.saveUserConfig(req.__CURRENT_USER.id, req.params['configApp'],
              req.body.key, req.body.value);
        } else {
          return apiRender.renderBizFail(res);
        }
      }).then((items) => {
        debug(items);
        return apiRender.renderSuccess(res);
      }).catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户笔芯总额
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.fetchUserLikeSum = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then(() => {
        return userLikeService.fetchUserLikeStaticitcs(req.__CURRENT_USER.id);
      })
      .then((result) => {
        return apiRender.renderBaseResult(res, result);
      }).catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户笔芯记录
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.fetchUserLikes = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userLikeListQuerySchema, req.query)
      .then((params) => {
        return userLikeService.fetchUserLikeRules(req.__CURRENT_USER.id,
            params.pageNumber, params.pageSize, params.bizType);
      })
      .then((result) => {
        return apiRender.renderBaseResult(res, result);
      }).catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户笔芯规则
 *  * 目前规则在后台定死，暂时不入库
 * @param req
 * @param res
 */
pub.fetchUserLikeRules = (req, res) => {
  const rules = [
    {
      'title': '完成新手任务',
      'desc': '快去查看下方新手任务吧',
      'algorithmDesc': '+10'
    },
    {
      'title': '获取他人笔芯',
      'desc': '提交公开作业后获得别人赞赏',
      'algorithmDesc': '+1'
    }
  ];
  return apiRender.renderBaseResult(res, rules);
};

/**
 * 获取用户笔芯任务完成情况
 *  -如果有相关的笔芯任务就算是完成了
 * @param req
 * @param res
 */
pub.fetchUserLikeTasks = (req, res) => {
  //1.定义task enum
  const tasks = enumModel.userLikeTaskEnum;
  //2.查询目前学员的记录里完成了什么
  return schemaValidator.validatePromise(accountSchema.userLikeTaskQuerySchema, req.query)
      .then((params) => {
        return userLikeService.fetchUserLikeFromTasks(req.__CURRENT_USER.id, _.keys(tasks), 'WECHAT_MINI_KY');
      })
      .then((likes) => {
        //3.合并，标记数据
        _.each(likes, (like) => {
          let likeType = like.likeType;
          tasks[likeType]['finished'] = true;
          tasks[likeType]['userLikeObject'] = like;
        });

        let taskList = []
        _.each(_.keys(tasks), (key) => {
          if (_.isNil(tasks[key]['finished'])) {
            tasks[key]['finished'] = false;
          }
          taskList.push(tasks[key]);
        });

        return apiRender.renderBaseResult(res, taskList);
      })
      .catch(req.__ERROR_HANDLER);

};


module.exports = pub;
