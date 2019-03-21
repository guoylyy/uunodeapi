'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');

const apiRender = require('../render/api.render');
const apiUtil = require('../util/api.util');

const clazzPostService = require('../../services/post.service');
const checkinService = require('../../services/checkin.service');

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

        const fetchClazzPostListPromise = clazzPostService.fetchUserClazzPostList(currentClazz, currentClazzAccount);

        const fetchClazzCheckinListPromise = checkinService.listCheckins(currentClazz, currentClazzAccount);

        return Promise.all([fetchClazzPostListPromise, fetchClazzCheckinListPromise]);
      })
      .then(([taskList, checkinResult]) => {
        const checkinMap = _.chain(checkinResult.checkins)
            .forEach((checkin) => {
              checkin.checkinDate = moment(checkin.checkinTime).format("YYYY-MM-DD")
            })
            .keyBy("checkinDate")
            .value();

        const clazz = apiUtil.pickClazzBasicInfo(currentClazz, currentClazzAccount);
        // 控制笃师一对一的显示
        clazz.hasTheOneFeedback = _.get(currentClazz, 'configuration.hasTheOneFeedback', false);
        clazz.accountEndDate = moment(_.get(currentClazzAccount, 'endDate') || currentClazz.endDate).format('YYYY-MM-DD');
        clazz.scoreSum = checkinResult.scoreSum;
        clazz.openDays = checkinResult.openDays;
        clazz.tasks = _.map(
            taskList,
            (task) => {
              const pickedTaskItem = apiUtil.pickClazzTaskBasicInfo(task);
              const taskDate = moment(task.targetDate).format('YYYY-MM-DD');
              pickedTaskItem.date = taskDate;
              pickedTaskItem.hasCheckin = _.has(checkinMap, taskDate);
              return pickedTaskItem;
            });

        // render数据
        return apiRender.renderBaseResult(res, clazz);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

module.exports = pub;
