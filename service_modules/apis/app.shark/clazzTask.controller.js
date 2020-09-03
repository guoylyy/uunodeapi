'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const apiRender = require('../render/api.render');
const Promise = require('bluebird');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const apiUtil = require('../util/api.util');

const clazzPostService = require('../../services/post.service');
const clazzTaskService = require('../../services/clazzTask.service');
const clazzFeedbackService = require('../../services/clazzFeedback.service');
const checkinService = require('../../services/checkin.service');

const enumModel = require('../../services/model/enum');
const taskUtil = require('../../services/util/task.util');

const pub = {};

/**
 * 列出所有课程任务
 * @param req
 * @param res
 */
pub.queryClazzTryTasks = (req, res)=>{
  const currentClazz = req.__CURRENT_CLAZZ;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${ currentClazz }任务列表`, queryParam);
        return clazzPostService.fetchClazzPostList(currentClazz);
      }).then((postList)=>{
        const stickiedGroupedPostMap = _.groupBy(postList, 'stickied');
        debug(stickiedGroupedPostMap);

        let stickiedPostList = stickiedGroupedPostMap[true];
        let unStickiedPostList = stickiedGroupedPostMap[false];
        if(_.isNil(stickiedPostList)){
          stickiedPostList = [];
        }
        return apiRender.renderBaseResult(res, _.extend(stickiedPostList, unStickiedPostList));
      }).
      catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 列出课程任务列表
 *
 * @param req
 * @param res
 */
pub.queryClazzTaskList = (req, res) => {
  const currentUserId = req.__CURRENT_USER.id,
      currentClazz = req.__CURRENT_CLAZZ,
      currentClazzAccount = req.__CURRENT_CLAZZ_ACCOUNT;

  debug(currentClazzAccount);

  const currentClazzId = currentClazz.id;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${ currentClazzId }任务列表`, queryParam);

        return clazzPostService.fetchUserClazzPostList(currentClazz, currentClazzAccount);
      })
      .then((postList) => {
        const taskIdList = _.chain(postList)
            .filter(['postType', enumModel.postTypeEnum.CLAZZ_TASK.key])
            .map('target')
            .value();

        const fetchClazzCheckinListPromise = checkinService.listCheckins(currentClazz, currentClazzAccount);

        const fetchPostListPromise = clazzTaskService.queryAllClazzTaskList(taskIdList)
            .then((taskList) => {
              const taskMap = _.keyBy(taskList, 'id');


              _.forEach(postList, (postItem) => {
                const targetItem = _.get(taskMap, postItem.target, {});

                // 过滤掉图片类型的文件
                postItem.introductionMaterialList = _.chain(targetItem)
                    .get('introductionMaterialList', [])
                    .reject((item) => item.type === enumModel.mediaTypeEnum.IMAGE.key)
                    .value();
              });

              return postList;
            });

        const queryLatestFeedbackAtPromise = clazzFeedbackService.queryLatestFeedbackAt(currentUserId, currentClazzId);

        return Promise.all([fetchPostListPromise, queryLatestFeedbackAtPromise, fetchClazzCheckinListPromise])
      })
      .then(([postList, latestFeedbackAt, checkinResult]) => {
        const pickedClazzInfo = apiUtil.pickClazzBasicInfo(currentClazz);
        pickedClazzInfo.latestFeedbackAt = latestFeedbackAt;

        debug(checkinResult);
        const checkinMap = _.chain(checkinResult.checkins)
            .forEach((checkin) => {
              checkin.checkinDate = moment(checkin.checkinTime).format("YYYY-MM-DD")
            })
            .keyBy("checkinDate")
            .value();

        debug("checkinMap");
        debug(checkinMap);

        pickedClazzInfo.tasks = _.map(postList, (task) => {
          const pickedTaskItem = apiUtil.pickClazzTaskBasicInfo(task);

          const taskDate = moment(task.targetDate).format('YYYY-MM-DD');
          pickedTaskItem.date = moment(task.targetDate).format('YYYY-MM-DD');

          pickedTaskItem.attachList = [];
          pickedTaskItem.attachTotalSize = 0;
          pickedTaskItem.hasCheckin = _.has(checkinMap, taskDate);

          return pickedTaskItem;
        });

        // render数据
        return apiRender.renderBaseResult(res, pickedClazzInfo);
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
  const currentTaskId = req.params.taskId,
      currentClazzId = _.get(req.__CURRENT_CLAZZ, 'id', ''),
      currentClazzTeachers = _.get(req.__CURRENT_CLAZZ.configuration, 'teacherOpenIds', []);
  debug(currentTaskId);

  return schemaValidator.validatePromise(clazzSchema.clazzTaskQuerySchema, req.query)
      .then((queryParam) => {
        debug(currentTaskId);

        const fetchTaskPromise = clazzTaskService.fetchClazzTaskById(currentTaskId, currentClazzId);
        const fetchPostPromise = _.isNil(queryParam.postId)
            ? Promise.resolve({})
            : clazzPostService.fetchClazzPostById(queryParam.postId, currentClazzId);

        return Promise.all([fetchTaskPromise, fetchPostPromise])
      })
      .then(([taskItem, postItem]) => {
        debug(taskItem);
        debug(postItem);

        // 设置任务简介
        const parseIntroductionPromiseList = _.map(
            taskItem.introductions,
            (introductionItem) => taskUtil.parseHtmlToListPromise(introductionItem.content)
                .then((introductionContent) => ({
                  type: introductionItem.type,
                  content: introductionContent,
                  htmlContent: introductionItem.content
                }))
        );

        return Promise.all(parseIntroductionPromiseList)
            .then((introductionList) => {
              const pickedTaskItem = _.pick(taskItem, ['id', 'title']);

              // 默认是V1版本的Type
              // 最新版本的是V2
              pickedTaskItem.taskType = _.get(taskItem, 'taskType', 'V1');

              // 设置author
              pickedTaskItem.author = _.get(req.__CURRENT_CLAZZ, 'author', taskItem.author);
              // 设置targetDate
              pickedTaskItem.targetDate = moment(_.get(postItem, 'targetDate', new Date())).format('YYYY-MM-DD');

              // 设置内容列表
              // 拼接HTML内容
              pickedTaskItem.introductions =_.filter(introductionList, (introduction) => {
                if(introduction.type != enumModel.clazzTaskIntroductionTypeEnum.USER_SHARE.key){
                    return introduction;
                }
              });

              let introducationHTML = "";
              _.each(introductionList, (intro)=>{
                let type = enumModel.clazzTaskIntroductionTypeEnum[intro.type];
                if(!_.isNil(type)){
                  introducationHTML = introducationHTML + "<div class=\"paragraph-title\">"+type.name + "</div>" + intro.htmlContent;
                }else{
                  introducationHTML = introducationHTML + intro.htmlContent;
                }
              });
              pickedTaskItem.introducationHTML  = introducationHTML;

              // 设置素材列表
              pickedTaskItem.materials = _.map(taskItem.materials, (material) => _.pick(material, ['id', 'title', 'type', 'url']));

              pickedTaskItem.clazz = apiUtil.pickClazzBasicInfo(req.__CURRENT_CLAZZ);

              return pickedTaskItem;
            });
      })
      .then((taskItem) => {
        taskItem['bindTeacher'] = _.get(req.__CURRENT_CLAZZ,'bindTeacher', {});
        taskItem['teacherOpenIds'] = currentClazzTeachers; //加入教师的openIds

        return apiRender.renderBaseResult(res, taskItem);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
