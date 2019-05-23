'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('controller');
const moment = require('moment');
const winston = require('winston');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const commonError = require('../../services/model/common.error');

const apiUtil = require('../util/api.util');
const clazzUtil = require('../../services/util/clazz.util');
const enumModel = require('../../services/model/enum');

const apiRender = require('../render/api.render');
const checkinService = require('../../services/checkin.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const ubandCardService = require('../../services/ubandCard.service');

/**
 * 调整日期到用户时区
 *
 * @param userItem
 * @param date
 * @returns {moment.Moment}
 */
const updateToUserTimezone = (userItem, date) => {
  // 用户时区枚举
  const userTimeZoneEnum = enumModel.getEnumByKey(_.get(userItem, 'timezone'), enumModel.timezoneEnum);

  const updatedMoment = moment(date).endOf('day');

  if (!_.isNil(userTimeZoneEnum)) {
    updatedMoment.utcOffset(userTimeZoneEnum.timezone);
  }

  return updatedMoment;
};

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
  debug(req.__CURRENT_CLAZZ_ACCOUNT);

  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${req.__CURRENT_CLAZZ.id}打卡记录`, queryParam);

        return checkinService.listCheckins(req.__CURRENT_CLAZZ, req.__CURRENT_CLAZZ_ACCOUNT);
      })
      .then((result) => {
        result.canCheckin = req.__CAN_CLAZZ_CHECKIN;
        result.userInfo = apiUtil.pickUserBasicInfo(req.__CURRENT_USER);
        result.clazz = apiUtil.pickClazzBasicInfo(req.__CURRENT_CLAZZ);
        // render数据
        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取打卡详情信息
 * 返回：
 * {
 *  clazz： 课程信息
 *  status：打卡状态
 *  score： 学分
 *  checkinTime： 打卡时间
 *  id： 打卡id
 *  userFiles： 用户文件列表
 *  cards:[]
 * }
 * @param req
 * @param res
 */
pub.fetchCheckinItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取打卡${req.__CURRENT_CHECKIN.id}详情`, queryParam);

        return checkinService.fillCheckinWithUserFiles(req.__CURRENT_CHECKIN, true);
      })
      .then((checkinItem) => {
        checkinItem.clazz = apiUtil.pickClazzBasicInfo(req.__CURRENT_CLAZZ);
        checkinItem.cards = [];
        return apiRender.renderBaseResult(res, checkinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新打卡条目
 *
 * @param req
 * @param res
 */
pub.updateCheckinItem = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.updateCheckinBodySchema, req.body)
      .then((checkinFiles) => {
        debug(checkinFiles);

        req.__MODULE_LOGGER(`更新打卡${ req.__CURRENT_CHECKIN.id }`, checkinFiles);

        return checkinService.updateCheckinFiles(req.__CURRENT_CHECKIN, checkinFiles)
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 取消打卡
 *
 * @param req
 * @param res
 */
pub.deleteCheckin = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`取消打卡${ req.__CURRENT_CHECKIN.id }`, queryParam);

        const checkinStatus = _.get(req.__CURRENT_CHECKIN, 'status', enumModel.checkinStatusEnum.ABNORMAL.key);
        if (checkinStatus !== enumModel.checkinStatusEnum.NORMAL.key) {
          return Promise.reject(commonError.PARAMETER_ERROR('打卡状态异常，无法取消!'));
        }

        return checkinService.destroyCheckinItem(req.__CURRENT_CHECKIN.id);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询用户当天打卡信息
 * {
 *  checkinTime: 当前时间,
 *  userFiles: 用户文件列表
 *  clazz: 课程信息
 *  canCheckin: 当前是否能打卡
 *  hasCheckin  当天是否已打卡
 * }
 *
 * @param req
 * @param res
 */
pub.queryCheckinStatus = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.queryCheckinStatusSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const userItem = req.__CURRENT_USER;
        req.__MODULE_LOGGER(`查询课程${req.__CURRENT_CLAZZ.id}当天打卡信息`, queryParam);

        const userId = userItem.id,
            clazzId = req.__CURRENT_CLAZZ.id,
            startDate = updateToUserTimezone(userItem, queryParam.date).startOf('day').toDate(),
            endDate = updateToUserTimezone(userItem, queryParam.date).endOf('day').toDate();

        const fillCheckinPromise = checkinService.fillCheckinWithUserFiles(
            {
              checkinTime: updateToUserTimezone(userItem, queryParam.date),
              createdAt: updateToUserTimezone(userItem, new Date()),
              userId: userId
            },
            true
        );

        const queryCheckinPromise = checkinService.queryCheckinList(userId, clazzId, startDate, endDate)
            .then((checkinList) => {
              if (_.isEmpty(checkinList)) {
                return null;
              }

              // 因存在补打卡的情况，只能在查询一遍
              return checkinService.fillCheckinWithUserFiles(_.first(checkinList), true);
            });

        const ubandCardsPromise = ubandCardService.queryUserAvailableCard(userId);

        return Promise.all([fillCheckinPromise, queryCheckinPromise, ubandCardsPromise]);
      })
      .then(([checkinItem, latestCheckinItem, cardItems]) => {
        const clazzItem = req.__CURRENT_CLAZZ,
          hasCheckin = !_.isNil(latestCheckinItem);

        const pickClazzItem = _.pick(req.__CURRENT_CLAZZ, ['id', 'name']),
            clazzStartEndDate = clazzUtil.calculateClazzStartEndDate(
                clazzItem.startDate,
                clazzItem.endDate,
                clazzItem.clazzType,
                req.__CURRENT_CLAZZ_ACCOUNT.joinDate
            );

        // 开班日期，结班日期
        pickClazzItem.startDate = clazzStartEndDate.startDate;
        pickClazzItem.endDate = clazzStartEndDate.endDate;

        debug(pickClazzItem);

        // 班级信息
        checkinItem.clazz = pickClazzItem;
        // 当前能否打卡
        checkinItem.canCheckin = req.__CAN_CLAZZ_CHECKIN;
        // 是否已经打卡
        checkinItem.hasCheckin = hasCheckin;

        // 用户一共有几张复活卡
        checkinItem.cards = cardItems;

        // 设施打卡id
        checkinItem.id = _.get(latestCheckinItem, ['id'], null);

        if (hasCheckin) {
          checkinItem.userFiles = latestCheckinItem.userFiles
        }

        return apiRender.renderBaseResult(res, checkinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户当天打卡
 *
 * @param req
 * @param res
 */
pub.createClazzCheckin = (req, res) => {
  let globalCheckinItem,     // 打卡条目
      globalIsCreateCheckin; // 是否为新建打卡, false代表为补打卡

  const PREVIOUS_ADD_CHECKIN_COUNT = req.__CURRENT_CLAZZ_ACCOUNT.addCheckinCount || 0;

  return schemaValidator.validatePromise(clazzSchema.createCheckinBodySchema, req.body)
      .then((checkinItem) => {
        debug(checkinItem);

        req.__MODULE_LOGGER(`提交课程${req.__CURRENT_CLAZZ.id}打卡`, checkinItem);

        const clazzItem = req.__CURRENT_CLAZZ;
        // 记录打卡信息
        globalCheckinItem = checkinItem;
        const checkinDate = checkinItem.date,
            nowMoment = moment(),
            clazzStartEndDate = clazzUtil.calculateClazzStartEndDate(
                clazzItem.startDate,
                clazzItem.endDate,
                clazzItem.clazzType,
                req.__CURRENT_CLAZZ_ACCOUNT.joinDate
            );

        // 如果打卡日期在结班日期之后，或在当前日期之后
        if (moment(checkinDate).isAfter(clazzStartEndDate.endDate, 'day') || nowMoment.isBefore(checkinDate)) {
          return Promise.reject(commonError.PARAMETER_ERROR('该日期不支持打卡'));
        }

        // 是否为当天打卡
        // 如果不是当天打卡就是补打卡
        globalIsCreateCheckin = nowMoment.isSame(checkinDate, 'day');

        if (globalIsCreateCheckin) {
          req.__MODULE_LOGGER('打卡', checkinItem);
        } else {
          req.__MODULE_LOGGER('补打卡', checkinItem);
        }
        const userItem = req.__CURRENT_USER;

        // 判断当天是否已经打卡
        const startDate = updateToUserTimezone(userItem, checkinDate).startOf('day').toDate(),
            endDate = updateToUserTimezone(userItem, checkinDate).endOf('day').toDate();

        debug(startDate);
        debug(endDate);

        let ubandCardPromise = ubandCardService.queryUserAvailableCard(userItem.id);

        if(globalIsCreateCheckin){
          ubandCardPromise = Promise.resolve(req.__CURRENT_CLAZZ_ACCOUNT);
        }
        const checkinListPromise = checkinService.queryCheckinList(userItem.id, clazzItem.id, startDate, endDate);
        return Promise.all([checkinListPromise, ubandCardPromise]);
      })
      .then(([checkinList, cardItems]) => {
        debug(checkinList);
        // 已经打卡
        if (!_.isEmpty(checkinList)) {
          return Promise.reject(commonError.PARAMETER_ERROR('当天已打卡'));
        }

        let updateCheckinCountPromise;
        let updateCardPromise;
        // 如果为当天打卡
        if (globalIsCreateCheckin) {
          // 该班级当前无法打卡
          if (!req.__CAN_CLAZZ_CHECKIN) {
            return Promise.reject(commonError.PARAMETER_ERROR('非打卡时间'));
          }
          // 正常打卡，修正打卡时间为1分钟前
          globalCheckinItem.date = moment().add(-1, 'minutes').toDate();
          updateCheckinCountPromise = Promise.resolve(req.__CURRENT_CLAZZ_ACCOUNT);
          updateCardPromise = Promise.resolve(req.__CURRENT_CLAZZ_ACCOUNT);
        } else {
          // 补打卡，修正时间为当天开始时间
          globalCheckinItem.date = moment(globalCheckinItem.date).startOf('day').toDate();

          if(_.isNil(cardItems) || cardItems.length == 0){
            return Promise.reject(commonError.PARAMETER_ERROR('你没有足够的复活卡，无法补打卡'));
          }
          // 补打卡，记录次数
          updateCheckinCountPromise = clazzAccountService.update({
            id: req.__CURRENT_CLAZZ_ACCOUNT.id,
            addCheckinCount: PREVIOUS_ADD_CHECKIN_COUNT + 1
          });

          // 把最顶上的复活卡改为已经使用的状态
          let cardItem = cardItems[0];//获取最顶上的打卡
          updateCardPromise = ubandCardService.update({
            id: cardItem.id,
            status: enumModel.ubandCardStatusEnum.USED.key
          })

        }

        // 打卡
        let createCheckinPromise = checkinService.createClazzCheckinItem(req.__CURRENT_USER.id, req.__CURRENT_CLAZZ.id, globalCheckinItem);

        return Promise.all([createCheckinPromise, updateCheckinCountPromise, updateCardPromise])
            .catch((error) => {
              winston.error('用户 %s 打卡失败', req.__CURRENT_USER.id);

              // 还原补打卡次数
              updateCheckinCountPromise = clazzAccountService.update({
                id: req.__CURRENT_CLAZZ_ACCOUNT.id,
                addCheckinCount: PREVIOUS_ADD_CHECKIN_COUNT
              });

              return Promise.reject(error);
            });
      })
      .then((checkinItem) => {
        debug(checkinItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 * TODO:
 *  获取打卡的统计信息
 * @param req
 * @param res
 */
pub.getCheckinSumdata = (req, res) =>{

  let sumData = {
    'checkinNum': 23,
    'joinNum': 24,
    'backMoney': 138
  };

  return apiRender.renderBaseResult(res, sumData);

};

module.exports = pub;
