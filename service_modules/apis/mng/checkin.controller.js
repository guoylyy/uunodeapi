'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const Promise = require('bluebird');
const moment = require('moment');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const userSchema = require('./schema/user.schema');
const commonSchema = require('../common.schema');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const checkinService = require('../../services/checkin.service');
const userService = require('../../services/user.service');
const userScoreService = require('../../services/userScore.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const clazzFeedbackService = require('../../services/clazzFeedback.service');

const wechatTemplateReply = require('../../lib/wechat.template.reply');

const pub = {};

/**
 * 查询班级在某天的打卡记录
 *
 * @param req
 * @param res
 */
pub.queryPagedCheckinList = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.checkinQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const clazzId = req.__CURRENT_CLAZZ.id,
            queryDate = new Date(queryParam.date),
            pageNumber = queryParam.pageNumber,
            pageSize = queryParam.pageSize,
            keyword = queryParam.keyword;

        if (_.isEmpty(keyword)) {
          return checkinService.fetchClazzCheckinPagedList(clazzId, queryDate, pageNumber, pageSize);
        } else {
          return checkinService.fetchClazzCheckinPagedListByKeyword(clazzId, queryDate, keyword, pageNumber, pageSize);
        }
      })
      .then((result) => {
        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取班级某天未打卡学员列表
 *
 * @param req
 * @param res
 */
pub.queryPagedUncheckinList = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.checkinQuerySchema, req.query)
      .then((queryParam) => {
        return checkinService.queryPagedClazzUncheckins(req.__CURRENT_CLAZZ.id, new Date(queryParam.date), queryParam.pageNumber, queryParam.pageSize, queryParam.keyword);
      })
      .then((result) => {
        result.values = _.map(result.values, 'user');
        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取打卡详细信息
 *  带可访问url
 *
 * @param req
 * @param res
 */
pub.fetchCheckinItem = (req, res) => {
  const currentCheckinItem = req.__CURRENT_STUDENT_CHECKIN_ITEM;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const fillUserFilePromise = checkinService.fillCheckinWithUserFiles(currentCheckinItem, true);
        const queryAllUserScoreRecordsPromise = userScoreService.fetchAllScoreRecordsByIdList(_.get(currentCheckinItem, ['userScoreIds'], []));

        return Promise.all([fillUserFilePromise, queryAllUserScoreRecordsPromise]);
      })
      .then(([checkinItem, userScoreList]) => {
        debug(checkinItem);

        checkinItem.userFiles = _.filter(checkinItem.userFiles, 'hasCheckined');
        checkinItem.remark = _.get(currentCheckinItem, ['remark'], null);
        checkinItem.userScore = _.get(currentCheckinItem, ['userScore'], 0);
        checkinItem.userScoreList = userScoreList;

        return apiRender.renderBaseResult(res, checkinItem);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 修改课程打卡记录
 *
 * @param req
 * @param res
 */
pub.updateCheckinItem = (req, res) => {
  let isNotify = false;
  schemaValidator.validatePromise(clazzSchema.updateCheckinBodySchema, req.body)
      .then((toUpdateCheckin) => {
        debug(toUpdateCheckin);

        isNotify = toUpdateCheckin.isNotify;

        delete toUpdateCheckin.isNotify;

        return checkinService.updateCheckinItem(req.__CURRENT_STUDENT_CHECKIN_ITEM.id, toUpdateCheckin);
      })
      .then((checkinItem) => {
        debug(checkinItem);

        if (isNotify === true) {

          // 推送打卡提醒模板消息
          userService.fetchById(req.__CURRENT_STUDENT_CHECKIN_ITEM.userId)
              .then((userItem) => {
                wechatTemplateReply.sendCheckinAlertMsg(userItem, req.__CURRENT_CLAZZ, checkinItem.remark);
              })
              .catch(winston.error);
        }

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 创建打卡评分
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.createCheckinScoreRecord = (req, res) => {
  const currentCheckin = req.__CURRENT_STUDENT_CHECKIN_ITEM,
      currentClazz = req.__CURRENT_CLAZZ;

  debug(currentCheckin);

  const userId = currentCheckin.userId,
      clazzId = currentClazz.id,
      checkinReviewType = enumModel.userScoreTypeEnum.CHECKIN_REVIEW.key,
      currentCheckinId = currentCheckin.id;

  return schemaValidator.validatePromise(userSchema.userCheckinReviewScoreSchema, req.body)
      .then((checkinReviewScore) => {
        debug(checkinReviewScore);

        return userScoreService.addUserScoreRecord({
          userId: userId,
          clazzId: clazzId,
          adminId: req.__CURRENT_ADMIN.id,
          scoreChange: checkinReviewScore.score,
          type: enumModel.userScoreTypeEnum.CHECKIN_REVIEW.key,
          targetId: currentCheckin.id,
          remark: checkinReviewScore.remark,
          changeAt: new Date(),
        });
      })
      .then((userScoreRecord) => {
        debug(userScoreRecord);

        const updateCheckinScorePromise = userScoreService.calculateUserScore(userId, clazzId, checkinReviewType, currentCheckinId)
            .then((checkinScore) => {
              const userScoreIds = _.get(currentCheckin, ['userScoreIds'], []);
              userScoreIds.push(userScoreRecord.id);

              debug(userScoreIds);

              return checkinService.updateCheckinItem(currentCheckinId, {
                userScore: checkinScore,
                userScoreIds: userScoreIds
              });
            });

        // todo 抽取方法
        const queryClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(clazzId, userId)
            .then(_.head);
        const calculateClazzScorePromise = userScoreService.sumClazzScore(userId, clazzId);

        const updateClazzScorePromise = Promise.all([queryClazzAccountPromise, calculateClazzScorePromise])
            .then(([clazzAccount, clazzScore,]) => {
              debug(clazzAccount);

              if (_.isNil(clazzAccount)) {
                return Promise.reject(commonError.BIZ_FAIL_ERROR('不存在的clazzAccount帐号'));
              }

              // 通知用户
              clazzFeedbackService.fetchClazzFeedbackByUserId(clazzId, userId)
                  .then((feedbackItem) => {
                    const adminInfo = _.pick(req.__CURRENT_ADMIN, ['id', 'name', 'headImgUrl']);
                    adminInfo.isSelf = true;

                    clazzFeedbackService.adminReplyFeedback(
                        feedbackItem,
                        {
                          replyType: enumModel.clazzFeedbackReplyTypeEnum.TEXT.key,
                          content: `你于 ${ moment(currentCheckin.checkinTime).format('YYYY-MM-DD') } 在 ${currentClazz.name} 的打卡得到了评分。\n评分：${ _.divide(userScoreRecord.scoreChange, 100).toFixed(2) } 分，班级总评分：${ _.divide(clazzScore, 100).toFixed(2) }。\n评价：${ userScoreRecord.remark }`
                        },
                        adminInfo,
                        currentClazz
                    );
                  });

              return clazzAccountService.update({
                id: clazzAccount.id,
                clazzScore: clazzScore
              });
            });

        return Promise.all([updateCheckinScorePromise, updateClazzScorePromise]);
      })
      .then(([checkinItem, clazzAccountItem]) => {
        debug(checkinItem);
        debug(clazzAccountItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
