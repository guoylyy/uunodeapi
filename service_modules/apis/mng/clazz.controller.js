'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const enumModel = require('../../services/model/enum');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const apiUtil = require('../util/api.util');

const clazzService = require('../../services/clazz.service');
const adminService = require('../../services/admin.service');
const statisticService = require('../../services/statistic.service');

const clazzUtil = require('../../services/util/clazz.util');

let pub = {};

/**
 * 获取用户索管理的班级列表
 *
 * @param req
 * @param res
 */
pub.fetchClazzList = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.clazzQuerySchema, req.query)
      .then((queryParam) => {
        let clazzIds = _.keys(req.__CURRENT_ADMIN.permissions[enumModel.permissionTypeEnum.CLAZZ_PERMISSION.key]);
        debug(clazzIds);

        if (_.isEmpty(clazzIds)) {
          return Promise.resolve([]);
        }

        return clazzService.queryClazzes(queryParam.status, clazzIds, null, null, queryParam.name);
      })
      .then((clazzList) => {
        let pickedClazzList = _.map(clazzList, apiUtil.pickClazzBasicInfo);
        return apiRender.renderBaseResult(res, pickedClazzList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取课程基本信息
 *
 * @param req
 * @param res
 */
pub.fetchClazzInfo = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(res, apiUtil.pickClazzBasicInfo(req.__CURRENT_CLAZZ));
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取班级当前情况
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchClazzStatus = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const currentClazzId = currentClazzItem.id;

        const fetchAssistantListPromise = adminService.fetchClazzAssistantList(currentClazzId),
            fetchClazzStatPromise = statisticService.fetchClazzStatItem(currentClazzId);

        return Promise.all([fetchAssistantListPromise, fetchClazzStatPromise]);
      })
      .then((result) => {
        const assistantList = result[0],
            clazzStat = result[1];

        debug(assistantList);
        debug(clazzStat);

        const pickedAssistantList = _.map(assistantList, (assistant) => _.pick(assistant, ['id', 'name', 'headImgUrl']));

        const clazzItem = _.pick(
            currentClazzItem,
            ['id', 'name', 'clazzType', 'description', 'banner', 'author', 'startDate', 'endDate', 'configuration.taskCount']
        );
        // 计算开班天数
        const dayNumber = clazzUtil.calculateClazzDayNumber(
            currentClazzItem.startDate,
            currentClazzItem.startDate,
            currentClazzItem.clazzType
        );
        // 设置开班天数
        clazzItem.dayNumber = _.min([dayNumber, _.get(currentClazzItem, ['configuration', 'taskCount'], 0)]);
        const priceList = clazzUtil.extractClazzPriceList(currentClazzItem);
        // 设置价格列表
        _.set(clazzItem, ['configuration', 'priceList'], priceList);
        // 设置助手列表列表
        clazzItem.assistantList = pickedAssistantList;
        // 设置统计情况
        clazzItem.statistic = _.pick(clazzStat, ['id', 'targetTime', 'studentCount', 'cancelCount', 'checkinCount', 'checkinRate']);

        return apiRender.renderBaseResult(res, clazzItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询班级统计消息列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryClazzStatusList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
 
        const currentClazz = req.__CURRENT_CLAZZ;

        // 结束日期为 课程结束日期  当天 中的小值
        const endMoment = moment.min([moment(currentClazz.endDate), moment().endOf('day')]);
        // 开始日期为 课程开始日期 30天前 中的大值
        const startMoment = moment.max([moment(currentClazz.startDate), moment(endMoment).add(-30, 'days').startOf('day')]);

        debug(startMoment);
        debug("====time====");
        debug(endMoment);

        return statisticService.fetchClazzStatList(currentClazz.id, startMoment.toDate(), endMoment.toDate());
      })
      .then((clazzStatList) => {
        debug(clazzStatList);

        const pickedClazzStatList = _.map(
            clazzStatList,
            (clazzStat) => _.pick(clazzStat, ['id', 'checkinCount', 'checkinRate', 'targetTime'])
        );

        return apiRender.renderBaseResult(res, pickedClazzStatList);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
