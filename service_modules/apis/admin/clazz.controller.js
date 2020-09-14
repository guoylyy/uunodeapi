'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');
const winston = require('winston');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const apiUtil = require('../util/api.util');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const wechatTemplateReply = require('../../lib/wechat.template.reply');

const clazzUtil = require('../../services/util/clazz.util');

const clazzService = require('../../services/clazz.service');
const userService = require('../../services/user.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const clazzExitService = require('../../services/clazzExit.servie');
const userCoinService = require('../../services/userCoin.service');

/**
 * 分页获取班级列表
 *
 * @param req
 * @param res
 */
const queryPagedClazzList = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.clazzQuerySchema, req.query)
      .then((querySchema) => {
        debug(querySchema);

        return clazzService.queryPagedClazzes(querySchema.pageNumber, querySchema.pageSize, querySchema.status, null, null, querySchema.name);
      })
      .then((pagedClazz) => {
        debug(pagedClazz);

        let pickedClazzList = _.map(pagedClazz.values, (clazzItem) => _.pick(clazzItem, ['id', 'name', 'banner', 'clazzType', 'status', 'startDate', 'endDate']));

        return apiRender.renderPageResult(res, pickedClazzList, pagedClazz.itemSize, pagedClazz.pageSize, pagedClazz.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询所有课程列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
const queryAllClazzList = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.clazzQueryAllSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzService.queryClazzes(queryParam.status, null, '', null);
      })
      .then((clazzList) => {
        debug(clazzList);

        const pickedClazzList = _.map(clazzList, apiUtil.pickClazzBasicInfo);

        return apiRender.renderBaseResult(res, pickedClazzList);
      })
      .catch(req.__ERROR_HANDLER);
};

const matchClazzExitWithClazzAndUser = (clazzExitList, pickClazzBasicInfo = apiUtil.pickClazzBasicInfo) => {
  if (_.isEmpty(clazzExitList)) {
    return Promise.resolve([]);
  }

  const clazzIdList = _.map(clazzExitList, 'clazzId'),
      userIdList = _.map(clazzExitList, 'userId');

  debug(clazzExitList);
  debug(userIdList);

  const queryUserListPromise = userService.queryUser(null, userIdList);
  const queryClazzList = clazzService.queryClazzes(null, clazzIdList, null, null);

  return Promise.all([queryUserListPromise, queryClazzList])
      .then(([userList, clazzList]) => {
        const userMap = _.keyBy(userList, 'id'),
            clazzMap = _.keyBy(clazzList, 'id');

        return _.map(
            clazzExitList,
            (clazzExit) => {
              const pickedClazzExit = _.pick(clazzExit, ['id', 'status', 'applyDate']);
              pickedClazzExit.clazzInfo = pickClazzBasicInfo(_.get(clazzMap, clazzExit.clazzId));
              pickedClazzExit.userInfo = apiUtil.pickUserBasicInfo(_.get(userMap, clazzExit.userId));

              return pickedClazzExit;
            }
        );
      });
};

const pub = {};

/**
 * 查询课程类表
 *  isAll 控制是否分页
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryClazzes = (req, res) => {
  const isAll = req.query.isAll;
  delete req.query.isAll;

  if (isAll === 'true') {
    return queryAllClazzList(req, res);
  } else {
    return queryPagedClazzList(req, res);
  }
};

/**
 * 新建班级 -- 基本信息
 *
 * @param req
 * @param res
 */
pub.createClazzItem = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.createClazzBodySchema, req.body)
      .then((clazzItem) => {
        debug(clazzItem);

        // 运营配置
        clazzItem.configuration = {
          QALimit: 0,
          addCheckinLimit: 0,
          invitationRequire: 1000,
          groupRequire: 0,
          hasTheOneFeedback: false,
          feedbackRound: 0,
          taskCount: 28,
          startHour: 1,
          eachDayBackFee: 0,
          endHour: 24,
          discount: 1,
          strategyLink: "",
          clazzType: [],
          teacherOpenIds: []
        };

        return clazzService.createClazzItem(clazzItem);
      })
      .then((createdClazzItem) => {
        debug(createdClazzItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取班级基本信息
 *
 * @param req
 * @param res
 */
pub.fetchClazzItem = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        let pickedClazzItem = _.pick(
            req.__CURRENT_CLAZZ,
            ['id', 'name', 'banner', 'smallBanner', 'teacherHead', 'tags', 'bindTeacherId', 'clazzType', 'status', 'author', 'openDate', 'startDate', 'endDate', 'description', 'isShow', 'isHot', 'classifyType']
        );

        debug(pickedClazzItem);

        return apiRender.renderBaseResult(res, pickedClazzItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新班级基本信息
 *
 * @param req
 * @param res
 */
pub.updateClazzItemBasicInfo = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.updateClazzBodySchema, req.body)
      .then((clazzItem) => {
        debug(clazzItem);

        return clazzService.updateClazzItem(req.__CURRENT_CLAZZ.id, clazzItem);
      })
      .then((createdClazzItem) => {
        debug(createdClazzItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

pub.fetchClazzConfiguration = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        const currentClazz = req.__CURRENT_CLAZZ;
        const clazzConfiguration = req.__CURRENT_CLAZZ.configuration;
        // 确保teacherOpenIds字段一定存在
        clazzConfiguration.teacherOpenIds = clazzConfiguration.teacherOpenIds || [];
        if (currentClazz.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key) {
          clazzConfiguration.priceList = clazzUtil.extractClazzPriceList(currentClazz);
        }
        clazzConfiguration.promotionOffer = _.get(
            clazzConfiguration,
            'promotionOffer',
            {
              isPromotion: true,
              promotionIncome: 0,
              firstOffer: 0
            }
        );

        debug(clazzConfiguration);

        return apiRender.renderBaseResult(res, clazzConfiguration);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新班级配置信息
 *
 * @param req
 * @param res
 */
pub.updateClazzConfiguration = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.updateClazzConfigurationBodySchema, req.body)
      .then((clazzConfiguration) => {
        debug('clazzConfiguration',clazzConfiguration);

        const currentClazzItem = req.__CURRENT_CLAZZ;
        // 参数判断
        if (currentClazzItem.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key) {
          if (!_.isNil(clazzConfiguration.originFee) || !_.isNil(clazzConfiguration.totalFee)) {
            return Promise.reject(commonError.PARAMETER_ERROR('长期班不允许存在originFee或totalFee'));
          }
        } else {
          if (!_.isNil(clazzConfiguration.priceList)) {
            return Promise.reject(commonError.PARAMETER_ERROR('非长期班不允许存在priceList'));
          }
        }

        const updatedClazzConfiguration = _.assign(currentClazzItem.configuration, clazzConfiguration);

        debug('updatedForm',updatedClazzConfiguration);

        return clazzService.updateClazzItem(currentClazzItem.id, { configuration: updatedClazzConfiguration });
      })
      .then((createdClazzItem) => {
        debug(createdClazzItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取班级简介信息
 *
 * @param req
 * @param res
 */
pub.fetchClazzIntroductionItem = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        return clazzService.fetchIntroductionById(req.__CURRENT_CLAZZ.introduction);
      })
      .then((clazzIntroductionItem) => {
        debug(clazzIntroductionItem);

        let pickedClazzIntroductionItem = _.pick(clazzIntroductionItem, ['id', 'title', 'subTitle', 'requiredInfo', 'strategy', 'introduction']);

        debug(pickedClazzIntroductionItem);

        return apiRender.renderBaseResult(res, pickedClazzIntroductionItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新班级简介
 *
 * @param req
 * @param res
 */
pub.updateClazzIntroductionItem = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.updateClazzIntroductionBodySchema, req.body)
      .then((clazzIntroductionItem) => {
        debug(clazzIntroductionItem);

        return clazzService.updateClazzIntroduction(req.__CURRENT_CLAZZ.introduction, clazzIntroductionItem);
      })
      .then((updatedClazzIntroductionItem) => {
        debug(updatedClazzIntroductionItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询学员列表
 *
 * @param req
 * @param res
 */
pub.queryStudentList = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.studentQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzAccountService.searchClazzUsers(req.__CURRENT_CLAZZ.id, [queryParam.status], null, [])
      })
      .then((studentList) => {
        debug(studentList);

        const pickedStudentList = _.map(studentList, apiUtil.pickUserBasicInfo);

        return apiRender.renderBaseResult(res, pickedStudentList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取分页退班数据
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryPagedClazzExitList = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.clazzExitQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzExitService.queryPagedClazzExitList(queryParam.status, queryParam.clazzId, queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedClazzExit) => {
        const clazzExitList = pagedClazzExit.values;

        return matchClazzExitWithClazzAndUser(clazzExitList)
            .then((matchedClazzExitList) => {
              pagedClazzExit.values = matchedClazzExitList;
              return pagedClazzExit;
            });
      })
      .then((pagedClazzExit) => {
        debug(pagedClazzExit);

        return apiRender.renderPageResult(res, pagedClazzExit.values, pagedClazzExit.itemSize, pagedClazzExit.pageSize, pagedClazzExit.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取退班详情
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchClazzExitItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const matchClazzExitPromise = matchClazzExitWithClazzAndUser(
            [req.__CURRENT_CLAZZ_EXIT_ITEM],
            (clazzItem) => {
              const pickedClazzItem = apiUtil.pickClazzBasicInfo(clazzItem);

              pickedClazzItem.startDate = moment(clazzItem.startDate).format('YYYY-MM-DD');
              pickedClazzItem.endDate = moment(clazzItem.endDate).format('YYYY-MM-DD');
              pickedClazzItem.priceList = clazzUtil.extractClazzPriceList(clazzItem);

              return pickedClazzItem;
            }
        );

        const fetchClazzAccountPromise = clazzAccountService.fetchClazzAccountById(req.__CURRENT_CLAZZ_EXIT_ITEM.clazzAccountId);

        return Promise.all([matchClazzExitPromise, fetchClazzAccountPromise])
      })
      .then(([[clazzExitItem], clazzAccountItem]) => {
        debug(clazzExitItem);

        const pickedClazzExitItem = _.pick(
            req.__CURRENT_CLAZZ_EXIT_ITEM,
            ['id', 'status', 'userCoins', 'userReason', 'applyDate', 'realUserCoins', 'remark']
        );

        const billInfo = clazzAccountItem.bill;

        pickedClazzExitItem.applyDate = moment(pickedClazzExitItem.applyDate).format('YYYY-MM-DD');
        pickedClazzExitItem.userInfo = clazzExitItem.userInfo;
        pickedClazzExitItem.clazzInfo = clazzExitItem.clazzInfo;
        pickedClazzExitItem.userPayInfo = _.isNil(billInfo) ? null : JSON.parse(billInfo);

        return apiRender.renderBaseResult(res, pickedClazzExitItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新退班
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.updateClazzExit = (req, res) => {
  const currentClazzExitItem = req.__CURRENT_CLAZZ_EXIT_ITEM;
  const currentClazzExitId = currentClazzExitItem.id;

  // 是否通知用户
  let isNotify = false;

  return schemaValidator.validatePromise(clazzSchema.clazzExitSchema, req.body)
      .then((clazzExit) => {
        debug(clazzExit);

        const clazzExitStatus = clazzExit.status,
            clazzExitRealUserCoins = clazzExit.realUserCoins,
            clazzExitRemark = clazzExit.remark;
        isNotify = clazzExit.isNotify;

        if (currentClazzExitItem.status !== enumModel.clazzExitStatusTypeEnum.WAITING.key) {
          return Promise.reject(commonError.PARAMETER_ERROR('该退班记录不允许修改！'));
        }

        let verifyPromise = null;

        if (clazzExitStatus !== enumModel.clazzExitStatusTypeEnum.AGREED.key) {
          verifyPromise = clazzExitService.updateClazzExitById(currentClazzExitId, clazzExitStatus, clazzExitRealUserCoins, null, clazzExitRemark)
        } else {
          const fetchClazzAccountPromise = clazzAccountService.fetchClazzAccountById(currentClazzExitItem.clazzAccountId);
          const fetchClazzPromise = clazzService.fetchClazzById(currentClazzExitItem.clazzId);

          verifyPromise = Promise.all([fetchClazzAccountPromise, fetchClazzPromise])
              .then(([clazzAccountItem, clazzItem]) => {
                debug(clazzAccountItem);
                const clazzAccountStatus = _.get(clazzAccountItem, ['status'], null);

                if (_.isNil(clazzAccountItem) ||
                    (clazzAccountStatus !== enumModel.clazzJoinStatusEnum.PROCESSING.key && clazzAccountStatus !== enumModel.clazzJoinStatusEnum.WAITENTER.key)
                ) {
                  return Promise.reject(commonError.BIZ_FAIL_ERROR('学员当前状态不允许退班！'));
                }

                const createUserCoinService = userCoinService.createUserCoin({
                  coinChange: clazzExitRealUserCoins,
                  remark: clazzExitRemark,
                  title: '班级退班',
                  bizType: enumModel.coinBizTypeEnum.QUITCLAZZ.key,
                  bizId: currentClazzExitId,
                  userId: currentClazzExitItem.userId,
                  changeDate: new Date()
                });

                const updateClazzAccountPromise = clazzAccountService.updateClazzAccountAndRelatedRecords(
                    { id: clazzAccountItem.id, status: enumModel.clazzJoinStatusEnum.CANCELED.key },
                    clazzItem
                );

                return Promise.all([createUserCoinService, updateClazzAccountPromise]);
              })
              .then(([userCoinItem, [updatedClazzAccountItem, clazzAccountRecordList]]) => {
                debug(userCoinItem);
                debug(updatedClazzAccountItem);
                debug(clazzAccountRecordList);

                return clazzExitService.updateClazzExitById(currentClazzExitId, clazzExitStatus, clazzExitRealUserCoins, userCoinItem.id, clazzExitRemark);
              })
        }

        return verifyPromise.then((updatedClazzExitItem) => {
          if (isNotify === true) {
            debug("sending notification");
            // 推送信息
            const fetchUserPromise = userService.fetchById(currentClazzExitItem.userId);
            const fetchClazzPromise = clazzService.fetchClazzById(currentClazzExitItem.clazzId);

            Promise.all([fetchClazzPromise, fetchUserPromise])
                .then(([clazzItem, userItem]) => {
                  debug(clazzItem);
                  debug(userItem);

                  const coinChangeStr = clazzExitRealUserCoins >= 0
                      ? `+${ clazzExitRealUserCoins }`
                      : `-${ clazzExitRealUserCoins }`;

                  const alertRemark = clazzExitStatus === enumModel.clazzExitStatusTypeEnum.AGREED.key
                      ? `你申请的 ${ clazzItem.name } 退班已审核通过，退款至你的优币账户，请点击该消息前往提现。`
                      : `你申请的 ${ clazzItem.name } 退班审核未通过，原因为：${ clazzExitRemark }`;

                  return wechatTemplateReply.sendGambicoinChangeMsg(userItem, coinChangeStr, alertRemark, enumModel.coinBizTypeEnum.QUITCLAZZ.name);
                })
                .catch(winston.error);
          }

          debug(updatedClazzExitItem);

          return apiRender.renderSuccess(res);
        });
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
