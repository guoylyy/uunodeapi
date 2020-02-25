'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const Promise = require('bluebird');

const apiUtil = require('../util/api.util');
const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzFeedbackSchema = require('./schema/clazzFeedback.schema');

const wechatUser = require('../../lib/wechat.user');
const wechatPayment = require('../../lib/wechat.payment');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const clazzAccountService = require('../../services/clazzAccount.service');
const clazzFeedbackRecordService = require('../../services/clazzFeedbackRecord.service');

const wechatTemplateReply = require('../../lib/wechat.template.reply');

const pub = {};

/**
 * 笃师获取学员当前反馈轮数
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchClazzFeedbackStatus = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        debug(req.__CURRENT_STUDENT_CLAZZ_ACCOUNT_ITEM);

        return clazzFeedbackRecordService.queryClazzTeacherFeedbackStatus(
            req.__CURRENT_CLAZZ.id,
            req.__CURRENT_STUDENT_USER_ITEM.id,
            req.__CURRENT_USER.id
        );
      })
      .then((feedbackRoundMap) => {
        debug(feedbackRoundMap);

        return apiRender.renderBaseResult(res, {
          feedbackRound: feedbackRoundMap[enumModel.clazzFeedbackRecordStatusEnum.COMPLETED.key]
        });
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 笃师修改反馈轮数
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.updateClazzFeedbackStatus = (req, res) => {
  return schemaValidator.validatePromise(clazzFeedbackSchema.updateFeedbackStatusBodySchema, req.body)
      .then((feedbackItem) => {
        debug(feedbackItem);

        const currentClazz = req.__CURRENT_CLAZZ,
            currentTeacherUser = req.__CURRENT_USER,
            currentStudentUser = req.__CURRENT_STUDENT_USER_ITEM,
            currentStudentAccountItem = req.__CURRENT_STUDENT_CLAZZ_ACCOUNT_ITEM;

        const createClazzFeedbackRecordPromise = clazzFeedbackRecordService.createClazzFeedbackRecordCompleteItem(
            currentClazz.id,
            currentStudentUser.id,
            currentTeacherUser.id,
            {}
        );

        // 已使用笃师一对一反馈次数
        const previousUsedFeedbackCount = currentStudentAccountItem.usedFeedbackCount || 0;

        const updateUsedFeedbackCountPromise = clazzAccountService.update({
              id: currentStudentAccountItem.id,
              usedFeedbackCount: previousUsedFeedbackCount + 1
            })
            .catch((error) => {
              //  更新为旧值
              clazzAccountService.update({
                id: currentStudentAccountItem.id,
                usedFeedbackCount: previousUsedFeedbackCount
              });

              // 继续抛出错误
              throw  error;
            });

        return Promise.all([updateUsedFeedbackCountPromise, createClazzFeedbackRecordPromise])
            .then((updatedClazzAccount) => {
              debug(updatedClazzAccount);

              if (feedbackItem.isNotify === true) {
                wechatTemplateReply.sendReplySuccessRedirectToMiniProgramMsg(
                    currentClazz,
                    currentStudentUser,
                    currentTeacherUser,
                    req.__CURRENT_STUDENT_USER_BIND_ITEM,
                    req.__CURRENT_USER_BIND_ITEM
                    )
                    .catch(winston.error);
              }

              return apiRender.renderSuccess(res);
            });
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取班级笃师一对一支付详情
 *
 * @param req
 * @param res
 */
pub.fetchFeedbackPaymentDetails = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        const currentClazzItem = req.__CURRENT_CLAZZ,
            currentClazzAccountItem = req.__CURRENT_CLAZZ_ACCOUNT;
        const feedbackConfig = _.get(currentClazzItem, 'feedbackConfig', {});

        debug(feedbackConfig);
        debug(currentClazzAccountItem);

        // 获取学员购买 及 已用 反馈次数
        const purchasedFeedbackCount = currentClazzAccountItem.purchasedFeedbackCount || 0,
            usedFeedbackCount = currentClazzAccountItem.usedFeedbackCount || 0;

        // 增加笃师及价格配置
        const clazzInfoWithFeedbackConfig = _.extend(
            apiUtil.pickClazzBasicInfo(currentClazzItem),
            {
              priceConfig: feedbackConfig.priceConfig,                        // 价格配置
              clazzFeedback: {
                purchasedFeedbackCount: purchasedFeedbackCount,
                usedFeedbackCount: usedFeedbackCount,
                remainFeedbackCount: purchasedFeedbackCount - usedFeedbackCount // 剩余次数
              }
            }
        );

        return apiRender.renderBaseResult(res, clazzInfoWithFeedbackConfig);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 用户支付笃师一对一
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.userPayClazzFeedback = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ;

  return schemaValidator.validatePromise(clazzFeedbackSchema.userPayClazzFeedbackBodySchema, req.body)
      .then((paymentBill) => {
        debug(paymentBill);

        // todo 待帐号系统升级后，更新
        return wechatUser.requestWeappUserInfo(paymentBill.code, paymentBill.encryptedData, paymentBill.iv)
            .then((weappUserInfo) => {
              // 生成账单
              return wechatPayment.weappOnePaymentHandler(
                  {
                    feedbackCount: paymentBill.feedbackCount,
                    money: paymentBill.money
                  },
                  currentClazzItem,
                  req.__CURRENT_USER,
                  req.__CURRENT_CLAZZ_ACCOUNT,
                  weappUserInfo
              );
            })
      })
      .then((result) => {
        debug('----------------------------- result -----------------------------');
        debug(result);

        result.clazzInfo = apiUtil.pickClazzBasicInfo(currentClazzItem);

        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取笃师反馈状态
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchClazzTeacherFeedbackStatus = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((feedbackPayment) => {
        debug(feedbackPayment);
        const currentClazzItem = req.__CURRENT_CLAZZ;

        return clazzFeedbackRecordService.queryClazzTeacherFeedbackStatus(currentClazzItem.id, req.__CURRENT_USER.id, req.__CURRENT_CLAZZZ_TEACHER_ITEM.id);
      })
      .then((teacherFeedbackStatus) => {
        debug('----------------------------- results -----------------------------');
        debug(teacherFeedbackStatus);

        const clazzFeedbackStatus = _.pick(req.__CURRENT_CLAZZ_ACCOUNT, ['feedbackRound', 'purchasedFeedbackCount', 'usedFeedbackCount']);
        clazzFeedbackStatus.teacherFeedbackStatus = teacherFeedbackStatus;

        debug(clazzFeedbackStatus);

        return apiRender.renderBaseResult(res, clazzFeedbackStatus);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

module.exports = pub;
