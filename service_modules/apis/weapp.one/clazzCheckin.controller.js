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
        debug("checkinItem", checkinItem);

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

module.exports = pub;
