'use strict';

const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('controller');

const apiUtil = require('../util/api.util');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');

const clazzAccountService = require('../../services/clazzAccount.service');

const enumModel = require('../../services/model/enum');

const clazzUtil = require('../../services/util/clazz.util');

const pub = {};


/**
 * 根据班级状态分页列出课程
 * 当status为OPEN时，列出开放报名中的班级列表
 * 当status为PROCESSING时，列出当前用户正在进行中的班级
 * 当status为CLOSE时，列出当前用户已关闭的班级列表
 * @param req
 * @param res
 */
pub.queryClazzList = (req, res) => {
  // 1. 检出用户输入
  return schemaValidator.validatePromise(clazzSchema.clazzQuerySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        // return a list like [[clazz], [clazzAccount]]
        return clazzAccountService.queryUserClazzByStatus(
            req.__CURRENT_STUDENT_USER_ITEM,
            [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key],
            true
        );
      })
      .then(([clazzList, clazzAccountList]) => {
        const clazzAccountMap = _.keyBy(clazzAccountList, 'clazzId');

        // return a list of clazz
        return _.reduce(
            clazzList,
            (filteredClazzList, clazzItem) => {
              const clazzAccountStatus = _.get(clazzAccountMap, [clazzItem.id, 'status'], null);
              const clazzStartDate = _.get(clazzItem, 'startDate'); // 课程开始日期

              /**
               * 1. 只保留要显示的课程
               * 2. 仅显示未打卡的课程
               */
              if (clazzUtil.checkIsClazzShowForAccount(clazzItem, clazzAccountStatus) &&
                  _.get(clazzItem, ['hasCheckin'], true) === false &&
                  moment().isSameOrAfter(clazzStartDate)) {
                filteredClazzList.push(clazzItem);
              }

              return filteredClazzList;
            },
            []
        );
      })
      .then((clazzList) => {
        debug(clazzList);
        // 筛选数据
        const pickedClazzes = _.map(clazzList, apiUtil.pickClazzBasicInfo);

        // render数据
        return apiRender.renderBaseResult(res, pickedClazzes);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

module.exports = pub;
