'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const apiRender = require('../render/api.render');
const apiUtil = require('../util/api.util');

const clazzTaskService = require('../../services/clazzTask.service');
const clazzPostService = require('../../services/post.service');

const wechatCustomMessage = require('../../lib/wechat.custom.message');

const taskUtil = require('../../services/util/task.util');

const pub = {};

/**
 * 列出课程任务列表
 *
 * @param req
 * @param res
 */
pub.queryClazzTaskList = (req, res) => {
  debug(req.__CURRENT_CLAZZ_ACCOUNT);

  const currentClazz = req.__CURRENT_CLAZZ,
      currentClazzAccount = req.__CURRENT_CLAZZ_ACCOUNT;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${ currentClazz.id }任务列表`, queryParam);

        return clazzPostService.fetchUserClazzPostList(currentClazz, currentClazzAccount);
      })
      .then((taskList) => {
        const clazz = apiUtil.pickClazzBasicInfo(currentClazz, currentClazzAccount);
        // 控制笃师一对一的显示
        clazz.hasTheOneFeedback = _.get(currentClazz, 'configuration.hasTheOneFeedback', false);
        clazz.tasks = _.map(
            taskList,
            (task) => {
              const pickedTaskItem = apiUtil.pickClazzTaskBasicInfo(task);
              pickedTaskItem.date = moment(task.targetDate).format('YYYY-MM-DD');
              return pickedTaskItem;
            });
        clazz.accountEndDate = moment(_.get(currentClazzAccount, 'endDate') || currentClazz.endDate).format('YYYY-MM-DD');

        // render数据
        return apiRender.renderBaseResult(res, clazz);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取课程任务详情
 *
 * @param req
 * @param res
 */
pub.fetchClazzTaskItem = (req, res) => {
  const taskId = req.params.taskId,
      clazzId = _.get(req.__CURRENT_CLAZZ, 'id', '');
  debug(taskId);

  schemaValidator.validatePromise(clazzSchema.fetchClazzTaskQuerySchema, req.query)
      .then((queryParam) => {
        debug(taskId);

        const fetchTaskPromise = clazzTaskService.fetchClazzTaskById(taskId, clazzId);
        let fetchPostPromise;

        if (_.isNil(queryParam.postId)) {
          fetchPostPromise = Promise.resolve({});
        } else {
          fetchPostPromise = clazzPostService.fetchClazzPostById(queryParam.postId, clazzId);
        }

        return Promise.all([fetchTaskPromise, fetchPostPromise])
      })
      .then((results) => {
        const taskItem = results[0],
            postItem = results[1];

        const pickedTaskItem = _.pick(taskItem, ['id', 'title', 'createdAt', 'teacher', 'shareType', 'coverPic']);

        debug(taskItem);
        debug(postItem);

        pickedTaskItem.introductions = _.map(taskItem.introductions, (introductionItem) => {
          const content = _.get(introductionItem, 'content', '');

          introductionItem.content = taskUtil.clearNodeClazzAndStyle(content);

          return introductionItem;
        });
        // 设置素材列表
        pickedTaskItem.materials = _.map(taskItem.materials, (material) => _.pick(material, ['id', 'title', 'type', 'url']));
        // 设置targetDate
        pickedTaskItem.targetDate = _.get(postItem, 'targetDate', taskItem.createdAt);
        // 设置author
        pickedTaskItem.author = _.get(req.__CURRENT_CLAZZ, 'author', taskItem.author);
        // 班级信息
        pickedTaskItem.clazz = apiUtil.pickClazzBasicInfo(req.__CURRENT_CLAZZ);

        // todo 移除createdAt
        return apiRender.renderBaseResult(res, pickedTaskItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取课程回复列表
 *
 * @param req
 * @param res
 */
pub.fetchReplies = (req, res) => {
  let taskId = req.params.taskId;
  debug(taskId);

  schemaValidator.validatePromise(commonSchema.mongoIdSchema, taskId)
      .then((taskId) => {
        debug(taskId);
        return clazzTaskService.fetchRepliesByTaskId(taskId);
      })
      .then((replies) => {
        return apiRender.renderBaseResult(res, replies);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 创建用户回复
 *
 * @param req
 * @param res
 */
pub.createTaskReply = (req, res) => {
  let taskId = req.params.taskId;
  debug(taskId);

  schemaValidator.validatePromise(clazzSchema.createTaskReplyBodySchema, req.body)
      .then((replyItem) => {
        debug(replyItem);

        // 填充信息
        replyItem.replayDate = new Date();
        replyItem.fromUserId = req.__CURRENT_USER.id;
        replyItem.clazzTask = taskId;

        return clazzTaskService.replyClazzTask(taskId, req.__CURRENT_CLAZZ.id, replyItem);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 分享分朋友圈/群打卡
 * @type {{}}
 */
pub.createTaskShare = (req, res) => {
  debug(req.__CURRENT_CLAZZ_ACCOUNT);
  let taskId = req.params.taskId;
  let clazzId = req.__CURRENT_CLAZZ.id;
  let createItem = {};
  let isPush = false;

  schemaValidator.validatePromise(clazzSchema.createShareLogBodySchema, req.body)
      .then((replyItem) => {
        debug("shareReplyItem", replyItem);
        // 填充信息
        createItem = replyItem;
        isPush = replyItem.isPush;

        //保护更新的时候没问题
        if(replyItem.name != "324"){
          createItem.shareDate = new Date(replyItem.name); //今日分享日期
        }else{
          createItem.shareDate = new Date();
        }

        debug('shareTime', createItem.shareDate);

        if(replyItem.userId){
          createItem.userId = replyItem.userId; //分享用户id
        }else{
          createItem.userId = req.__CURRENT_USER.id;
        }

        createItem.clazzTask = taskId; //分享的任务id
        createItem.clazzId = clazzId; //分享的课程id
        return clazzTaskService.countDateClazzTaskShareLog(clazzId, createItem.userId, createItem.shareDate);
      })
      .then((countNum) =>{
        debug('shareCountNum', countNum);

        if(countNum > 0){
          isPush = false;
          return Promise.resolve({});
        }else{
          return clazzTaskService.createClazzTaskShareLog(createItem);
        }
      })
      .then(() => {
        //推送一个模板消息，告知分享打卡成功
        if(isPush){
          let openId = req.__CURRENT_USER.openId;
          debug("===OPENID====", openId);
          wechatCustomMessage.makeAndSendCustomTextMessage(
              openId,
              '您今日的班级分享打卡已经成功！可在[课程主页]查询!'
          );
        }else{
          //证明是点击事件，存一个点击的记录
          let item = {
            clickTime: new Date(),
            clazzId: clazzId,
            taskId : taskId,
            userId : createItem.userId
          };
          clazzTaskService.createShareClick(item);
        }
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 * 查询用户分享朋友圈次数
 * @type {{}}
 */
pub.queryUserTaskShare = (req, res) => {
  let clazzId = req.__CURRENT_CLAZZ.id;
  let userId = req.__CURRENT_USER.id;
  debug("==== Find Share List ====")
  // 查询所有用户的分享记录
  clazzTaskService.queryClazzTaskShareLog(clazzId, userId)
      .then((list) => {

        //返回用户去重的分享记录
        let dt = {
          'shareNumber':0,
          'shareLog': []
        };

        _.map(list, (item) => {
          let dtStr = moment(item.shareDate).format('YYYY-MM-DD');
          if(!_.includes(dt.shareLog, dtStr)){
            dt.shareLog.push(dtStr);
            debug(item.clazzId);
            debug(item.userId);
            dt.shareNumber = dt.shareNumber + 1;
          }
        });

        return apiRender.renderBaseResult(res, dt);
      }).catch(req.__ERROR_HANDLER);
};

module.exports = pub;
