'use strict';

/**
 * 用户相关API
 */

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');
const apiUtil = require('../util/api.util');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const accountSchema = require('./schema/account.schema');

const userService = require('../../services/user.service');
const userConfigService = require('../../services/userConfig.service');
const userLikeService = require('../../services/userLike.service');

const enumModel = require('../../services/model/enum');

const taskService = require('../../services/task.service');

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
        // 处理学校和证书
        if (_.isNil(pickedUserInfo['school'])){
          pickedUserInfo['school'] = null;
         }
        if (_.isNil(pickedUserInfo['certification'])){
          pickedUserInfo['certification'] = [];
        }else{
          let certs = [];
          _.each(pickedUserInfo['certification'].split(","), (item) =>{
             certs.push(enumModel.getEnumByKey(item, enumModel.userCertificationEnum));
          });
          pickedUserInfo['certification'] = certs;
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
        return userLikeService.fetchUserLikeStaticitcs(req.__CURRENT_USER.id, 'WECHAT_MINI_KY');
      })
      .then((result) => {
        return apiRender.renderBaseResult(res, {'sum': result});
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
        return userLikeService.fetchUserLikesByPageList(req.__CURRENT_USER.id,
            'WECHAT_MINI_KY', params.pageNumber, params.pageSize);
      })
      .then((result) => {
        //获取列表信息
        if(!_.isNil(result.values) && _.isArray(result.values)){
          const values = _.map(result.values,(item)=>{
              return apiUtil.pickUserLikeListInfo(item);
          });
          result.values = values;
        }
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
      'likeAddDesc': '+笔芯10'
    },
    {
      'title': '获取他人笔芯',
      'desc': '提交公开作业后获得别人赞赏',
      'likeAddDesc': '+笔芯1'
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
          tasks[likeType]['userLike'] = apiUtil.pickUserLikeListInfo(like);
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

/**
 * 个人中心任务打卡统计数据
 * @param req
 * @param res
 */
pub.fetchTaskCheckinStatistics = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
  .then(() => {
    const result = {};
    result.records = [
      {
        "date": new Date('2019-11-25'),
        "quantity" : "MORE"
      },
      {
        "date": "2019-12-26T00:00:00.000Z",
        "quantity" : "LESS"
      },
      {
        "date": "2019-12-27T00:00:00.000Z",
        "quantity" : "NORMAL"
      },
      {
        "date": "2019-12-28T00:00:00.000Z",
        "quantity" : "EMPTY"
      },
    ]
    result.todayPracticeTime = 100;
    result.totalPracticeTime = 1000;
    result.enTask = 400;
    result.zhTask = 600;
    return apiRender.renderBaseResult(res, result);
  })
  .catch(req.__ERROR_HANDLER);
}

    // const result = [{
    //   "title": "关于幸福的演讲",
    //   "sourceDate": "2017-04-01T16:23:31.038Z",
    //   "duration": 100,
    //   "language": "CN",
    //   "oppoLanguage": "EN",
    //   "theme": "TECH",
    //   "pic": "http://qiniuprivate.gambition.cn/1577262618965_oeh8LY_001.jpg_720x720@2x.png",
    //   "createAt": "2019-12-23T16:23:31.038Z",
    //   "updateAt": "2019-12-23T16:23:31.038Z",
    //   "id": "5e007e310e992bcd972f2f4e",
    //   "lastCheckinMode": "INTERACT_TRANSLATE",
    //   "checkinDate": "2019-12-27T00:00:00.000Z",
    //   "checkinCount": 10
    // }, {
    //   "title": "关于幸福的演讲1",
    //   "sourceDate": "2017-04-01T16:23:31.038Z",
    //   "duration": 600,
    //   "language": "CN",
    //   "oppoLanguage": "EN",
    //   "theme": "TECH",
    //   "pic": "http://qiniuprivate.gambition.cn/1577262618965_oeh8LY_001.jpg_720x720@2x.png",
    //   "createAt": "2019-12-23T16:23:31.038Z",
    //   "updateAt": "2019-12-23T16:23:31.038Z",
    //   "id": "5e043246bcc3100f807d3404",
    //   "lastCheckinMode": "REPLAY_TRANSLATE",
    //   "checkinDate": "2019-12-27T00:00:00.000Z",
    //   "checkinCount": 15
    // }, {
    //   "title": "关于幸福的演讲2",
    //   "sourceDate": "2017-04-01T16:23:31.038Z",
    //   "duration": 200,
    //   "language": "CN",
    //   "oppoLanguage": "EN",
    //   "theme": "TECH",
    //   "pic": "http://qiniuprivate.gambition.cn/1577262618965_oeh8LY_001.jpg_720x720@2x.png",
    //   "createAt": "2019-12-23T16:23:31.038Z",
    //   "updateAt": "2019-12-23T16:23:31.038Z",
    //   "id": "5e04324ebcc3100f807d3405",
    //   "lastCheckinMode": "SHADOW_SPEAK",
    //   "checkinDate": "2019-12-27T00:00:00.000Z",
    //   "checkinCount": 20
    // },];
    // return apiRender.renderPageResult(res, result, 100, 10, 1);

/**
 * 口译记录列表 分页 按时间倒序
 * @param req
 * @param res
 */
pub.fetchTaskCheckinRecords = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.taskCheckinRecordsPagedSchema, req.query)
  .then((query) => {
    if (!_.isNil(query.gtDuration)) {
      query.duration = query.duration || {};
      query.duration.$gt = query.gtDuration
    }
    if (!_.isNil(query.ltDuration)) {
      query.duration = query.duration || {};
      query.duration.$lt = query.ltDuration
    }
    const param = {
      yearMonth: query.yearMonth,
      userId: req.__CURRENT_USER.id,
    }
    if (query.duration) {
      param["task.duration"] = query.duration;
    }
    if (query.theme) {
      param["task.theme"] = query.theme;
    }
    if (query.language) {
      param["task.language"] = query.language;
    }
    if (query.oppoLanguage) {
      param["task.oppoLanguage"] = query.oppoLanguage;
    }
    console.log(param);
    return taskService.queryPagedCheckinList(param);

  }).then((result) => {
    // let list = result.values;
    const checkinList = result.values;
    const queryCheckinCount = [];
    for (let i=0; i<checkinList.length; i++) {
      queryCheckinCount.push(taskService.countByParam({
        userId: req.__CURRENT_USER.id,
        taskId: checkinList[i].taskId
      }));
    }
    return Promise.all(queryCheckinCount)
    .then(countList => {
      for (let i=0; i<checkinList.length; i++) {
        checkinList[i].checkinCount = countList[i];
      }
      result.values = checkinList;
      return result;
    })

  }).then ((result) => {
    result.values = _.map(result.values, function(item) {
      return _.pick(item, ['id', 'task', 'createdAt', 'practiceMode', 'taskId', 'checkinCount'])
    })

    // 去重
    let set = [];
    result.values.forEach((item) => {
      let i=0;
      for (; i<set.length; i++) {
        console.log(item.createdAt.toString());
        console.log(set[i].createdAt.toString().substring(0, 10));
        if (_.isEqual(item.taskId, set[i].taskId) &&  _.isEqual(item.createdAt.toString().substring(0, 10), set[i].createdAt.toString().substring(0, 10))) {
          if (item.createdAt.toString() > set[i].createdAt.toString()){
            set[i] = item;
          }
          break;
        }
      }
      if (i == set.length) {
        set.push(item);
      }
    })
    result.values = set;
    return apiRender.renderPageResult(
      res,
      result.values,
      result.itemSize,
      result.pageSize,
      result.pageNumber
    );
  })
  .catch(req.__ERROR_HANDLER);
}

module.exports = pub;
