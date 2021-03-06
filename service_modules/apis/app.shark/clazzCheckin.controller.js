'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const apiUtil = require('../util/api.util');

const apiRender = require('../render/api.render');

const enumModel = require('../../services/model/enum');

const checkinService = require('../../services/checkin.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const clazzLuckyCheckinService = require('../../services/clazzLuckyCheckin.service');

const clazzUtil = require('../../services/util/clazz.util');

const pub = {};

/**
 * 获取用户打卡记录
 * 返回
 * {
 *  userInfo：用户信息
 *  clazz：   课程信息
 *  checkins: 打卡记录列表
 *  [{
 *    status：       打卡状态
 *    score：        学分
 *    checkinTime：  打卡时间
 *    dayNumber:     打卡时课程天数
 *    aheadSeconds： 提前打卡秒数
 *    id： 打卡id
 *  }]
 *  scoreSum: 课程学分
 *  openDays：开班天数
 *  canCheckin： 当前是否能打卡
 *  hasCheckin： 当天是否已打卡
 * }
 *
 * @param req
 * @param res
 */
pub.queryCheckinList = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ,
      currentClazzAccountItem = req.__CURRENT_CLAZZ_ACCOUNT;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${req.__CURRENT_CLAZZ.id}打卡记录`, queryParam);

        const currentClazzId = currentClazzItem.id,
            todayBeginDate = moment().startOf('day').toDate(),
            todayEndDate = moment().endOf('day').toDate();

        const listUserCheckinPromise = checkinService.listCheckins(currentClazzItem, currentClazzAccountItem);
        const queryClazzTodayChecinPromise = checkinService.queryCheckinList(null, currentClazzId, todayBeginDate, todayEndDate);
        const searchClazzAccountPromise = clazzAccountService.searchClazzUsers(
            currentClazzId,
            [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.CLOSE.key],
            null,
            null
        );

        return Promise.all([listUserCheckinPromise, queryClazzTodayChecinPromise, searchClazzAccountPromise]);
      })
      .then(([userCheckinResult, todayCheckinList, clazzUserList]) => {
        debug(clazzUserList);

        userCheckinResult.checkinCount = _.size(_.get(userCheckinResult, 'checkins', []));
        userCheckinResult.canCheckin = req.__CAN_CLAZZ_CHECKIN;
        userCheckinResult.userInfo = apiUtil.pickUserBasicInfo(req.__CURRENT_USER);

        _.forEach(userCheckinResult.checkins, (checkinItem) => {
          checkinItem.checkinTime = moment(checkinItem.checkinTime).format('YYYY-MM-DD');
        });

        const pickedClazzItem = apiUtil.pickClazzBasicInfo(currentClazzItem);

        const clazzStartEndDate = clazzUtil.calculateClazzStartEndDate(
            currentClazzItem.startDate,
            currentClazzItem.endDate,
            currentClazzItem.clazzType,
            currentClazzAccountItem.joinDate
        );

        // 开班日期，结班日期
        pickedClazzItem.startDate = moment(clazzStartEndDate.startDate).format('YYYY-MM-DD');
        pickedClazzItem.endDate = moment(clazzStartEndDate.endDate).add(-1, 'days').format('YYYY-MM-DD');

        pickedClazzItem.accountCount = _.size(clazzUserList);
        pickedClazzItem.accountList = _.chain(clazzUserList)
            .sampleSize(3)
            .map(apiUtil.pickUserBasicInfo)
            .value();

        pickedClazzItem.todayCheckinCount = _.size(todayCheckinList);

        userCheckinResult.clazz = pickedClazzItem;
        // render数据
        return apiRender.renderBaseResult(res, userCheckinResult);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 查询当天打卡动态
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.queryCheckinTrend = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ;
  const currentClazzId = currentClazzItem.id;

  return schemaValidator.validatePromise(clazzSchema.checkinTrendPagedQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return checkinService.fetchClazzCheckinPagedList(currentClazzId, new Date(), queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedResult) => {
        const pagedCheckinList = pagedResult.values;

        debug(pagedCheckinList);

        const userIdList = _.map(pagedCheckinList, 'user.id');

        const clazzBeginDate = moment(currentClazzItem.startDate).startOf('day').toDate(),
            todayEndDate = moment().endOf('day').toDate();

        return checkinService.queryCheckinList(userIdList, currentClazzId, clazzBeginDate, todayEndDate)
            .then((checkinList) => {
              const userCheckinCountMap = _.chain(checkinList)
                  .groupBy('userId')
                  .reduce(
                      (prev, userCheckinList, userId) => {
                        prev[userId] = _.size(userCheckinList);
                        return prev;
                      },
                      {}
                  )
                  .value();

              const pickedPagedCheckinList = _.map(pagedCheckinList, (checkinItem) => {
                const pickedCheckin = apiUtil.pickCheckinInfo(checkinItem, currentClazzItem.configuration.endHour);

                const checkinUser = _.get(pickedCheckin, ['userInfo']);
                if (!_.isNil(checkinUser)) {
                  checkinUser.checkinCount = _.get(userCheckinCountMap, checkinUser.id, 0);

                  pickedCheckin.userInfo = checkinUser;
                }

                return pickedCheckin;
              });

              return apiRender.renderPageResult(res, pickedPagedCheckinList, pagedResult.itemSize, pagedResult.pageSize, pagedResult.pageNumber);
            });
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 查询昨日抽打卡列表
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchClazzLuckyCheckins = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.clazzLuckyCheckinQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzLuckyCheckinService.queryClazzLuckyCheckinByDate(req.__CURRENT_CLAZZ.id, queryParam.date)
            .then((luckyCheckinItem) => {
              // 如果未抽取，则返回空数组
              if (_.isNil(luckyCheckinItem)) {
                return Promise.resolve(null);
              }

              return clazzLuckyCheckinService.fetchCheckinListByLuckyCheckinItem(luckyCheckinItem)
                  .then((checkinList) => {
                    debug(checkinList);

                    const pickedLuckyCheckin = apiUtil.pickClazzLuckyCheckinBasicInfo(luckyCheckinItem);
                    const checkinEndHour = _.get(req.__CURRENT_CLAZZ, ['configuration', 'endHour']);
                    pickedLuckyCheckin.chekcins = _.map(checkinList, (checkinItem) => apiUtil.pickCheckinInfo(checkinItem, checkinEndHour));

                    return pickedLuckyCheckin;
                  });
            });
      })
      .then((luckyCheckinItem) => {
        debug(luckyCheckinItem);

        return apiRender.renderBaseResult(res, luckyCheckinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.fetchClazzLuckyCheckinItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取打卡${req.__CURRENT_CHECKIN.id}详情`, queryParam);

        return checkinService.fillCheckinWithUserFiles(req.__CURRENT_CHECKIN, true);
      })
      .then((checkinItem) => {
        checkinItem.clazz = apiUtil.pickClazzBasicInfo(req.__CURRENT_CLAZZ);
        checkinItem.userFiles = checkinItem.userFiles.filter(item => item.hasCheckined);

        return apiRender.renderBaseResult(res, checkinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
