'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const clazzService = require('../../services/clazz.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const userService = require('../../services/user.service');
const checkinService = require('../../services/checkin.service');
const promotionService = require('../../services/promotion.service');
const userPayService = require('../../services/userPay.service');

const clazzUtil = require('../../services/util/clazz.util');
const apiUtil = require('../util/api.util');

const wechatTemplateReply = require('../../lib/wechat.template.reply');
const wechatUser = require('../../lib/wechat.user');
const wechatPromotion = require('../../lib/wechat.promotion');

const clazzProcessingStatusList = [enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.PROCESSING.key];
const clazzClosedStatusList = [enumModel.clazzJoinStatusEnum.CANCELED.key, enumModel.clazzJoinStatusEnum.CLOSE.key];


/**
 * 更新推广收益列表的clazzId为targetClazzId
 *
 * @param inviteeIncomeList
 * @param targetClazzId
 * @returns {Promise.<*>}
 */
const updatePromotionIncomeList = (inviteeIncomeList, targetClazzId) => {
  const updateInviteeIncomePromiseList = inviteeIncomeList.map((inviteeIncome) => promotionService.updatePromotionIncomeById({
    id: inviteeIncome.id,
    clazzId: targetClazzId
  }));

  return Promise.all(updateInviteeIncomePromiseList);
};

const pub = {};

/**
 * 获取班级学员列表
 *
 * @param req
 * @param res
 */
pub.queryPagedClazzStudents = (req, res) => {
  let clazzId = req.params.clazzId;

  schemaValidator.validatePromise(clazzSchema.clazzStudentsQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzAccountService.searchPagedClazzAccounts(clazzId, [queryParam.status], queryParam.keyword, queryParam.pageNumber, queryParam.pageSize, []);
      })
      .then((searchResult) => {
        // 筛选数据
        searchResult.values = _.map(searchResult.values, (clazzAccount) => {
          return _.pick(clazzAccount, ['id', 'user.id', 'user.studentNumber', 'user.name', 'user.headImgUrl', 'status', 'joinDate', 'endDate']);
        });

        return apiRender.renderPageResult(res, searchResult.values, searchResult.itemSize, searchResult.pageSize, searchResult.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 计算课程学分
 *
 * @param req
 * @param res
 */
pub.queryClazzScore = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzAccountService.calculateClazzScore(req.__CURRENT_CLAZZ, req.__CURRENT_STUDENT_CLAZZ_ACCOUNT);
      })
      .then((clazzScore) => {
        return apiRender.renderBaseResult(res, clazzScore);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 学员审核
 *
 * @param req
 * @param res
 */
pub.verifyClazzAccount = (req, res) => {
  const currentClazz = req.__CURRENT_CLAZZ,
      currentClazzAccount = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT;

  return schemaValidator.validatePromise(clazzSchema.verifyClazzAccountBodySchema, req.body)
      .then((clazzAccount) => {
        const isNotify = clazzAccount.isNotify;
        delete  clazzAccount.isNotify;

        debug(clazzAccount);
        // 设置id
        clazzAccount.id = currentClazzAccount.id;

        debug(clazzAccount);

        return clazzAccountService.updateClazzAccountAndRelatedRecords(clazzAccount, currentClazz)
            .then((results) => {
              const updatedClazzAccountItem = results[0];
              debug(updatedClazzAccountItem);

              const clazzAccountStatus = updatedClazzAccountItem.status,
                  clazzAccountUserId = currentClazzAccount.userId;
              // 成功加入班级 且 需要提醒的情况下；推送消息给用户
              if (isNotify === true && _.includes(clazzProcessingStatusList, clazzAccountStatus)) {

                userService.fetchById(clazzAccountUserId)
                    .then((userItem) => {
                      wechatTemplateReply.sendJoinSuccessMsg(userItem, currentClazz);
                    });
              }

              // 如果为取消课程则更新与该课程关联的推广收益
              if (clazzAccountStatus === enumModel.clazzJoinStatusEnum.CANCELED.key) {
                return wechatPromotion.cancelPromotionIncomeHandler(clazzAccountUserId, currentClazz);
              }

              // 其他情况则返回空数组
              return Promise.resolve([]);
            });
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 学员换班
 *
 * @param req
 * @param res
 */
pub.changeAccountClazz = (req, res) => {
  const currentClazzAccountStatus = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.status,
      currentClazzAccountId = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.id,
      currentClazzAccountUserId = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.userId;

  return schemaValidator.validatePromise(clazzSchema.changeAccountClazzBodySchema, req.body)
      .then((clazzAccount) => {
        debug(clazzAccount);

        // 已关闭的班级，不允许换班
        if (_.includes(clazzClosedStatusList, currentClazzAccountStatus)) {
          return Promise.reject(commonError.PARAMETER_ERROR('当前状态不允许换班'));
        }

        const queryClazzAccountsPromise = clazzAccountService.queryClazzAccountByClazzId(null, currentClazzAccountUserId);
        const fetchClazzPromise = clazzService.fetchClazzById(clazzAccount.clazzId);
        const fetchInviteeIncomeListPromise = promotionService.fetchPromotionIncomesByClazzId(
            currentClazzAccountUserId,
            req.__CURRENT_CLAZZ.id
        );

        return Promise.all([queryClazzAccountsPromise, fetchClazzPromise, fetchInviteeIncomeListPromise]);
      })
      .then(([clazzAccounts, targetClazz, inviteeIncomeList]) => {
        debug(targetClazz);
        debug(clazzAccounts);
        debug(inviteeIncomeList);

        const targetClazzId = targetClazz.id;

        if (_.isNil(targetClazz)) {
          return Promise.reject(commonError.PARAMETER_ERROR('不存在的班级'));
        }

        // 学员是否已在新班级内
        const joinedClazzIds = _.map(clazzAccounts, 'clazzId');
        debug(joinedClazzIds);
        if (_.includes(joinedClazzIds, targetClazz.id)) {
          return Promise.reject(commonError.PARAMETER_ERROR('用户已在该班级内'));
        }

        // 原班级是否为长期班
        const isOldClazzLongTerm = req.__CURRENT_CLAZZ.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key,
            // 新班级是否为长期班
            isNewClazzLongTerm = targetClazz.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key;

        const updateAccountAndIncomeList = () => {
          const updateAccountPromise = clazzAccountService.update({
            id: currentClazzAccountId,
            clazzId: targetClazzId
          });

          const updatePromotionIncomePromiseList = updatePromotionIncomeList(inviteeIncomeList, targetClazzId);

          return Promise.all([updateAccountPromise, updatePromotionIncomePromiseList])
              .then(([updatedClazzAccountItem, updatedIncomeList]) => {
                debug(updatedClazzAccountItem);
                debug(updatedIncomeList);

                return updatedClazzAccountItem;
              });
        };

        if ((isOldClazzLongTerm === true && isNewClazzLongTerm === true)) { // 新班 与 旧班 均为长期班
          /*
           如果长期班正在进行，则关闭旧班级，新增新班级记录
           其他状态，则直接更新记录
           */
          if (_.includes(clazzProcessingStatusList, currentClazzAccountStatus)) {
            const nowMoment = moment();
            const oldClazzAccountEndMoment = moment(req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.endDate || nowMoment),
                newClazzStartMoment = moment(targetClazz.startDate);

            debug(newClazzStartMoment);
            debug(oldClazzAccountEndMoment);

            const isNowMomentBefore = nowMoment.isBefore(newClazzStartMoment, 'day');

            /*
             计算新班级的开始时间与结束时间

             如果当天日期在开班日期之前， 则开始日期为开班日期当天， 结班日期为旧的结班日期+(开班日期 - 当天日期)
             否则，开始日期为当天日期， 结班日期为旧的结班日期
             */
            const newClazzAccountStartDate = isNowMomentBefore
                    ? newClazzStartMoment.startOf('day').toDate()
                    : moment(nowMoment).startOf('day').toDate(),
                newClazzAccountEndDate = isNowMomentBefore
                    ? oldClazzAccountEndMoment.add(newClazzStartMoment.diff(nowMoment, 'day'), 'day').endOf('day').toDate()
                    : oldClazzAccountEndMoment.endOf('day').toDate();


            debug(newClazzAccountStartDate);
            debug(newClazzAccountEndDate);

            const cancelOldClazzAccountPromise = clazzAccountService.cancelLongTermClazzAccount({ id: currentClazzAccountId }), // 退出当前班级
                createNewClazzAccountPromise = clazzAccountService.createClazzAccount( // 新建新班级的账户
                    {
                      status: enumModel.clazzJoinStatusEnum.PROCESSING.key,
                      joinDate: new Date(),
                      userId: currentClazzAccountUserId,
                      clazzId: targetClazzId,
                      endDate: newClazzAccountEndDate
                    });

            return Promise.all([createNewClazzAccountPromise, cancelOldClazzAccountPromise])
                .then((results) => {
                  debug(results);
                  const newClazzAccountItem = results[0];

                  // 新建新班级账户record记录
                  const createNewAccountRecordPromise = clazzAccountService.createClazzAccountRecord(
                      newClazzAccountItem,
                      {
                        startDate: newClazzAccountStartDate,
                        endDate: newClazzAccountEndDate
                      });

                  const updatePromotionIncomePromiseList = updatePromotionIncomeList(inviteeIncomeList, targetClazzId);

                  return Promise.all([createNewAccountRecordPromise, updatePromotionIncomePromiseList])
                      .then(([newClazzAccountRecordItem, updatedIncomeList]) => {
                        debug(newClazzAccountRecordItem);
                        debug(updatedIncomeList);

                        return newClazzAccountItem;
                      });
                });
          } else {
            // 直接更新记录
            return updateAccountAndIncomeList();
          }
        } else if (isOldClazzLongTerm === false && isNewClazzLongTerm === false) { // 新班 与 旧班 均不为长期班
          // 只需修改clazz_account记录
          return updateAccountAndIncomeList();
        } else {
          return Promise.reject(commonError.PARAMETER_ERROR('长期班与非长期班之间不能互换'));
        }
      })
      .then((updatedClazzAccountItem) => {
        debug(updatedClazzAccountItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询学员打卡状
 *  包括课程信息，用户文件信息
 *
 * @param req
 * @param res
 */
pub.queryAccountCheckinStatusByDate = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.queryCheckinStatusSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const userId = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.userId,
            clazzId = req.__CURRENT_CLAZZ.id,
            startDate = moment(queryParam.date).startOf('day').toDate(),
            endDate = moment(queryParam.date).endOf('day').toDate();

        req.__MODULE_LOGGER(`查询课程${ clazzId }学员${ userId }当天打卡信息`, queryParam);

        const fillCheckinPromise = checkinService.fillCheckinWithUserFiles({
          checkinTime: queryParam.date,
          createdAt: new Date(),
          userId: userId
        });

        const queryCheckinPromise = checkinService.queryCheckinList(userId, clazzId, startDate, endDate);

        return Promise.all([fillCheckinPromise, queryCheckinPromise]);
      })
      .then((results) => {
        const clazzItem = req.__CURRENT_CLAZZ;

        const checkinItem = results[0],
            checkinList = results[1],
            pickClazzItem = _.pick(req.__CURRENT_CLAZZ, ['id', 'name']),
            clazzStartEndDate = clazzUtil.calculateClazzStartEndDate(
                clazzItem.startDate,
                clazzItem.endDate,
                clazzItem.clazzType,
                req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.joinDate
            );

        // 开班日期，结班日期
        pickClazzItem.startDate = clazzStartEndDate.startDate;
        pickClazzItem.endDate = clazzStartEndDate.endDate;

        debug(pickClazzItem);

        // 班级信息
        checkinItem.clazz = pickClazzItem;
        // 是否已经打卡
        checkinItem.hasCheckin = !_.isEmpty(checkinList);

        return apiRender.renderBaseResult(res, checkinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 帮学员打卡
 *
 * @param req
 * @param res
 */
pub.createAccountCheinItem = (req, res) => {
  const nowMoment = moment(),                                       // 当期日期
      clazzItem = req.__CURRENT_CLAZZ,                              // 班级Item
      studentUserId = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.userId,   // 学员Id
      clazzId = req.__CURRENT_CLAZZ.id;                             //; 班级id

  let globalCheckinItem;

  schemaValidator.validatePromise(clazzSchema.createCheckinBodySchema, req.body)
      .then((checkinItem) => {
        debug(checkinItem);
        globalCheckinItem = checkinItem;

        req.__MODULE_LOGGER(`帮学员${ studentUserId }提交课程${ clazzId }打卡`, checkinItem);

        const checkinDate = checkinItem.date,
            clazzStartEndDate = clazzUtil.calculateClazzStartEndDate(
                clazzItem.startDate,
                clazzItem.endDate,
                clazzItem.clazzType,
                req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.joinDate
            );

        // 如果打卡日期在结班日期之后，或在当前日期之后
        if (moment(checkinDate).isAfter(clazzStartEndDate.endDate, 'day') || nowMoment.isBefore(checkinDate)) {
          return Promise.reject(commonError.PARAMETER_ERROR('该日期不支持打卡'));
        }

        // 判断当天是否已经打卡
        const startDate = moment(checkinDate).startOf('day').toDate(),
            endDate = moment(checkinDate).endOf('day').toDate();

        return checkinService.queryCheckinList(req.__CURRENT_STUDENT_CLAZZ_ACCOUNT.userId, clazzItem.id, startDate, endDate);
      })
      .then((checkinList) => {
        debug(checkinList);
        // 已经打卡
        if (!_.isEmpty(checkinList)) {
          return Promise.reject(commonError.PARAMETER_ERROR('学员当天已打卡'));
        }

        // 打卡
        return checkinService.createClazzCheckinItem(studentUserId, clazzId, globalCheckinItem);
      })
      .then((checkinItem) => {
        debug(checkinItem);

        return apiRender.renderSuccess(res);
      })
      .catch((error) => {
        winston.error('管理员[ %s ]帮学员[ %s ]提交课程[ %s ]打卡失败', req.__CURRENT_ADMIN.id, studentUserId, clazzId);

        return req.__ERROR_HANDLER(error);
      });
};

/**
 * 同步学员信息
 *
 * @param req
 * @param res
 */
pub.syncClazzStudents = (req, res) => {
  const clazzId = req.params.clazzId;

  schemaValidator.validatePromise(clazzSchema.syncStudentsInfoBodySchema, req.body)
      .then((queryParam) => {
        debug(queryParam);

        return clazzAccountService.searchClazzUsers(clazzId, [queryParam.status], queryParam.keyword, []);
      })
      .then(wechatUser.syncUserInfoList)
      .then((updatedUserList) => {
        debug(updatedUserList);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询长期班班级账户记录列表
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.queryClazzAccountRecordList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const pickedRecordList = _.map(req.__CURRENT_STUDENT_CLAZZ_ACCOUNT_RECORD_LIST, (recordItem) => {
          const pickedRecordItem = { id: recordItem.id };

          pickedRecordItem.startDate = moment(recordItem.startDate).format('YYYY-MM-DD');
          pickedRecordItem.endDate = moment(recordItem.endDate).format('YYYY-MM-DD');

          return pickedRecordItem;
        });

        return apiRender.renderBaseResult(res, pickedRecordList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新长期班班级账户记录列表
 * 1. 先创建新的记录列表
 * 2. 删除原有的记录列表
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.updateClazzAccountRecordList = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.updateClazzAccountRecordListBodySchema, req.body)
      .then((recordList) => {
        debug(recordList);
        const currentClazzAccount = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT;

        const endDate = moment.max(_.map(recordList, (record) => moment(record.endDate))).toDate();

        const createClazzAccountRecordPromiseList = _.map(
            recordList,
            (recordItem) => clazzAccountService.createClazzAccountRecord(currentClazzAccount, recordItem)
        );

        return Promise.all(createClazzAccountRecordPromiseList)
            .then((createResult) => {
              debug(createResult);

              return clazzAccountService.update({
                id: currentClazzAccount.id,
                endDate: endDate
              })
            });
      })
      .then((updateResult) => {
        debug(updateResult);

        const destoryOldClazzAccountPromiseList = _.map(
            req.__CURRENT_STUDENT_CLAZZ_ACCOUNT_RECORD_LIST,
            (recordItem) => clazzAccountService.deleteClazzAccountRecordItemById(recordItem.id)
        );

        return Promise.all(destoryOldClazzAccountPromiseList);
      })
      .then((destroyResult) => {
        debug(destroyResult);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询用户付款详情
 * @param req
 * @param res
 */
pub.queryClazzAccountPaybill = (req, res) =>{
  const currentClazz = req.__CURRENT_CLAZZ,
      currentClazzAccount = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then(()=>{
        debug(currentClazzAccount);
        const userPayPromise = userPayService.queryUserPayListByOutBiz(enumModel.userPayOutbizTypeEnum.CLAZZPAY.key,
            [currentClazzAccount.id]);

        const userInfoPromise = userService.fetchById(currentClazzAccount.userId);
        return Promise.all([userPayPromise, userInfoPromise])
      })
      .then(([userPay, userInfo])=>{
        const reuslt = {
          bill:{},
          userInfo:{},
          billDate: null,
          clazzInfo:{},
          userStatus: null
        };

        reuslt.clazzInfo = {
          clazzName: currentClazz.name,
          clazzPrice: currentClazz.configuration.totalFee,
          clazzStatus: currentClazz.status
        };
        reuslt.userStatus = currentClazzAccount.status;
        reuslt.billDate = currentClazzAccount.joinDate;
        reuslt.userInfo = apiUtil.pickUserBasicInfo(userInfo);

        if(!_.isNil(userPay) && _.isArray(userPay)){
          reuslt.bill = {
            payInfo:JSON.parse(userPay[0].bill),
            payDate: userPay[0].payTime,
            payWay: userPay[0].payway,
            payStatus: userPay[0].status
          };
        }
        return apiRender.renderBaseResult(res, reuslt);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
