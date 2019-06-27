'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const clazzTaskService = require('../../services/clazzTask.service');
const userService = require('../../services/user.service');
const materialService = require('../../services/materialLibray.service');

const wechatCustomMessage = require('../../lib/wechat.custom.message');

const taskUtil = require('../../services/util/task.util');

/**
 * 检查课程的素材列表是否均存在，并且设置任务的班级和作者信息
 *
 * @param taskItem
 * @param clazzItem
 * @param adminItem
 * @returns {Promise.<TResult>|Promise}
 */
let checkMaterialsAndSetAuthor = (taskItem, clazzItem, adminItem) => {
  return materialService.queryClazzMaterials(clazzItem.id, taskItem.materials)
      .then((materialList) => {
        if (materialList.length !== taskItem.materials.length) {
          return Promise.reject(commonError.PARAMETER_ERROR('素材列表不合法'));
        }

        // 设置班级id
        taskItem.clazz = clazzItem.id;
        // admin基本信息
        let adminInfo = _.pick(adminItem, ['id', 'name']);
        adminInfo.headimgurl = adminItem.headImgUrl;

        debug(adminInfo);

        // 设置author
        taskItem.author = adminInfo.name;
        // 设置课程介绍author
        _.forEach(taskItem.introductions, (introductionItem) => {
          introductionItem.author = adminInfo;
        });

        return taskItem;
      });
};

/**
 * 从任务的文字中抽取出素材信息
 *
 * @param taskItem
 * @returns {Promise.<TResult>|Promise}
 */
const extractIntroductionMaterials = (taskItem) => {
  return taskUtil.extractTaskMaterialList(taskItem)
      .then((materialIdList) => {
        debug(materialIdList);

        return materialService.queryClazzMaterials(null, materialIdList);
      })
      .then((materialList) => {
        debug(materialList);

        return _.map(materialList, (materialItem) => {
          const pickedMaterial = _.pick(materialItem, ['title', 'type', 'url']);

          pickedMaterial.materialId = materialItem.id;

          return pickedMaterial;
        });
      });
};

let pub = {};

/**
 * 分页列出课程任务
 *
 * @param req
 * @param res
 */
pub.queryPagedClazzTasks = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.clazzTaskesQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzTaskService.listPagedClazzTasks(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize, queryParam.title);
      })
      .then((result) => {
        // 数据处理
        result.values = _.map(result.values, (task) => {
          let pickedTask = _.pick(task, ['id', 'title', 'author', 'updatedAt']);
          pickedTask.materialCount = _.size(task.materials);

          return pickedTask;
        });
        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取班级任务详情
 *
 * @param req
 * @param res
 */
pub.fetchClazzTask = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        // 筛选数据
        let pickedTaskItem = _.pick(req.__CURRENT_CLAZZ_TASK, ['id', 'title', 'author','coverPic','shareType','teacher', 'dayNumber', 'targetDate', 'materials', 'introductions']);

        // 筛选素材
        pickedTaskItem.materials = _.map(pickedTaskItem.materials, (material) => _.pick(material, ['id', 'title', 'type', 'url', 'thumbnailUrl']));

        // render数据
        return apiRender.renderBaseResult(res, pickedTaskItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 新建课程任务
 *
 * @param req
 * @param res
 */
pub.createClazzTask = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.editClazzTaskItemBodySchema, req.body)
      .then((taskItem) => {
        debug(taskItem);

        const checkMaterialsPromise = checkMaterialsAndSetAuthor(taskItem, req.__CURRENT_CLAZZ, req.__CURRENT_ADMIN);
        const extractMaterialListPromise = extractIntroductionMaterials(taskItem);

        return Promise.all([checkMaterialsPromise, extractMaterialListPromise])
      })
      .then(([taskItem, materialList]) => {
        debug(taskItem);
        debug(materialList);

        taskItem.introductionMaterialList = materialList;

        return clazzTaskService.createClazzTask(taskItem);
      })
      .then((taskItem) => {
        debug(taskItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新课程任务
 *
 * @param req
 * @param res
 */
pub.updateClazzTask = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.editClazzTaskItemBodySchema, req.body)
      .then((taskItem) => {
        debug(taskItem);

        const checkMaterialsPromise = checkMaterialsAndSetAuthor(taskItem, req.__CURRENT_CLAZZ, req.__CURRENT_ADMIN);
        const extractMaterialListPromise = extractIntroductionMaterials(taskItem);

        return Promise.all([checkMaterialsPromise, extractMaterialListPromise])
      })
      .then(([taskItem, materialList]) => {
        debug(taskItem);
        debug(materialList);

        taskItem.id = req.__CURRENT_CLAZZ_TASK.id;
        taskItem.introductionMaterialList = materialList;

        return clazzTaskService.updateClazzTask(taskItem);
      })
      .then((taskItem) => {
        debug(taskItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 删除课程任务
 *
 * @param req
 * @param res
 */
pub.deleteClazzTask = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzTaskService.deleteClazzTask(req.__CURRENT_CLAZZ_TASK.id);
      })
      .then((taskItem) => {
        debug(taskItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 预览任务
 * @param req
 * @param res
 */
pub.previewTask = (req, res) =>{
  schemaValidator.validatePromise(clazzSchema.previewTaskSchema, req.query)
      .then((queryParam) =>{
        let studentNumber =  queryParam.studentNumber;
        return userService.fetchByStudentNumber(studentNumber);
      }).then((userObject)=>{
        if(_.isNil(userObject)){
          return apiRender.renderError(res, commonError.NOT_FOUND_ERROR("没有找到要推送的人"));
        }
        let link = `http://wechat.gambition.cn/study#/studyDetail?classId=${req.__CURRENT_CLAZZ.id}&taskId=${req.__CURRENT_CLAZZ_TASK.id}`;
        let postStr = `亲爱的,点击此处打开预览链接预览链接: ${link} 请点击查看推文`;

        wechatCustomMessage.sendCustomMessage(wechatCustomMessage.makeCustomMessage(userObject.openId,
            "TEXT", {content: postStr}))
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
