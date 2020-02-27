'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const enumModel = require('../../services/model/enum');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const clazzUtil = require('../../services/util/clazz.util');

const clazzService = require('../../services/clazz.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const userBindService = require('../../services/userBind.service');

/**
 * 从 userItem 中筛选出 pickAttributes 属性
 *
 * @param pickAttributes
 */
const getPickUserInfoFunction = (pickAttributes) => (userItem) => {
  const pickedUserItem = _.pick(userItem, pickAttributes);

  pickedUserItem.name = _.isNil(pickedUserItem.studentNumber)
      ? pickedUserItem.name
      : `${ pickedUserItem.name } | ${pickedUserItem.studentNumber}`;

  return pickedUserItem;
};

const pub = {};


/**
 * 根据班级状态分页列出课程
 *  当status为OPEN时，列出开放报名中的班级列表
 *  当status为PROCESSING时，列出当前用户正在进行中的班级
 *  当status为CLOSE时，列出当前用户已关闭的班级列表
 * @param req
 * @param res
 */
pub.queryClazzList = (req, res) => {
  // 1. 检出用户输入
  return schemaValidator.validatePromise(clazzSchema.clazzQuerySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        // 2. 根据status的不同调用不同的service方法，他们均返回课程列表
        if (queryParams.status === enumModel.clazzStatusEnum.OPEN.key) {
          req.__MODULE_LOGGER('获取报名课程列表', queryParams);

          // return a list of clazz
          return clazzService.queryClazzes(queryParams.status, null, null, null)
              .then((clazzList) => _.filter(clazzList, clazzUtil.checkIsClazzShow));
        }

        // 参数限制
        let joinStatus;
        switch (queryParams.status) {
          case enumModel.clazzStatusEnum.PROCESSING.key:
            if (queryParams.isCheckinable === true) {
              req.__MODULE_LOGGER('获取打卡课程列表', queryParams);
            } else {
              req.__MODULE_LOGGER('获取进行中课程列表', queryParams);
            }

            joinStatus = [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key];
            break;
          case enumModel.clazzStatusEnum.CLOSE.key:
            if (queryParams.isCheckinable === true) {
              return Promise.reject(commonError.PARAMETER_ERROR('不支持的查询方式'));
            }

            req.__MODULE_LOGGER('获取已结束课程列表', queryParams);
            joinStatus = [enumModel.clazzJoinStatusEnum.CLOSE.key, enumModel.clazzJoinStatusEnum.CANCELED.key];
            break;
          default:
            winston.error('获取课程列表失败，参数错误！！！queryParams: %j', queryParams);
            return Promise.reject(commonError.PARAMETER_ERROR('不支持的课程状态'));
        }

        const CURRENT_USER = req.__CURRENT_USER;
        // return a list like [[clazz], [clazzAccount]]
        return clazzAccountService.queryUserClazzByStatus(CURRENT_USER, joinStatus, queryParams.isCheckinable)
            .then((results) => {
              const clazzList = results[0],
                  clazzAccountMap = _.keyBy(results[1], 'clazzId');

              // return a list of clazz
              return _.reduce(clazzList,
                  (filteredClazzList, clazzItem) => {
                    const clazzAccountStatus = _.get(clazzAccountMap, [clazzItem.id, 'status'], null);

                    // 只保留要显示的课程
                    if (clazzUtil.checkIsClazzShowForAccount(clazzItem, clazzAccountStatus)) {
                      filteredClazzList.push(clazzItem);
                    }

                    return filteredClazzList;
                  },
                  []
              );
            });
      })
      .then((clazzList) => {
        // 筛选数据
        const pickedClazzes = _.map(
            clazzList,
            (clazz) => {
              const pickedClazz = _.pick(clazz, ['id', 'name', 'description', 'status', 'banner', 'startDate', 'endDate', 'author', 'hasCheckin']);
              pickedClazz.clazzJoinType = clazzUtil.getClazzJoinType(_.get(clazz, ['configuration', 'clazzType'], []));
              pickedClazz.totalFee = _.chain(clazzUtil.extractClazzPriceList(clazz)).head().get(['totalFee'], 0).value();

              return pickedClazz;
            }
        );
        // render数据
        return apiRender.renderBaseResult(res, pickedClazzes);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取用户好友列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchUserPartnerResult = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return userBindService.fetchClazzEasemobPartnerList(req.__CURRENT_CLAZZ.id, req.__CURRENT_USER_BIND_ITEM.id);
      })
      .then((partnerUserList) => {
        debug(partnerUserList);

        // 是否为班级笃师判断函数
        const checkIsClazzTeacher = clazzUtil.checkIsClazzTeacher(req.__CURRENT_CLAZZ);
        // 根据是否为笃师分成两组 [[teacherList], [partnerList]]
        const splitPartnerUserList = _.partition(partnerUserList, (userItem) => checkIsClazzTeacher(userItem.openId));

        const userAttributes = ['id', 'name', 'headImgUrl', 'studentNumber', 'bindInfo'];
        // 抽取用户基本信息函数
        const pickUserInfoFunction = getPickUserInfoFunction(userAttributes);

        const pickedUserBindInfo = _.pick(req.__CURRENT_USER_BIND_ITEM, ['id', 'accountName', 'password']);
        pickedUserBindInfo.isClazzTeacher = req.__IS_CURRENT_CLAZZ_TEACHER;

        // 组装信息
        const partnerResult = {
          userBindInfo: pickedUserBindInfo,
          teacherList: _.map(splitPartnerUserList[0], (userItem) => _.pick(userItem, userAttributes)),
          partnerList: _.map(splitPartnerUserList[1], pickUserInfoFunction)
        };

        return apiRender.renderBaseResult(res, partnerResult);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 查询班级陌生人列表
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.queryClazzEasemobStrangerUserBindList = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.queryClazzEasemobStrangerUserBindListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return userBindService.queryClazzStudentEasemobUserBindList(req.__CURRENT_CLAZZ, queryParam.keyword, [req.__CURRENT_USER.id]);
      })
      .then((userBindList) => {
        const pickUserItemFunction = getPickUserInfoFunction(['id', 'name', 'headImgUrl', 'studentNumber']);

        // 过滤掉好友列表
        const filteredUserBindList = _.chain(userBindList)
            .filter((userBindItem) => !_.includes(req.__CURRENT_USER_EASEMOB_PARTNER_BIND_ID_LIST, userBindItem.id))
            .map((userBindItem) => {
              userBindItem.userInfo = pickUserItemFunction(userBindItem.userInfo);

              return _.pick(userBindItem, ['id', 'accountName', 'userInfo']);
            })
            .value();

        debug(filteredUserBindList);

        return apiRender.renderBaseResult(res, filteredUserBindList);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 添加环信好友
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.addClazzEasemobFriend = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((body) => {
        debug(body);
        const friendBindId = req.__CURRENT_EASEMOB_FRINED_USER_BIND_ITEM.id;

        debug(req.__CURRENT_USER_EASEMOB_PARTNER_BIND_ID_LIST);

        if (_.includes(req.__CURRENT_USER_EASEMOB_PARTNER_BIND_ID_LIST, friendBindId)) {
          return apiRender.renderParameterError(res, '已添加过好友了');
        }

        return userBindService.addUserClazzEasemobPartnerList(req.__CURRENT_CLAZZ.id, req.__CURRENT_USER_BIND_ITEM.id, [friendBindId])
            .then((relationItem) => {
              debug(relationItem);

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取环信第三方账户信息
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.getEasemobUserBindInfo = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const pickedUserBindInfo = _.pick(req.__CURRENT_USER_BIND_ITEM, ['id', 'accountName', 'password']);
        pickedUserBindInfo.isClazzTeacher = req.__IS_CURRENT_CLAZZ_TEACHER;

        return apiRender.renderBaseResult(res, pickedUserBindInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
