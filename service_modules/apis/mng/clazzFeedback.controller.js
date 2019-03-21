'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');

const clazzFeedbackService = require('../../services/clazzFeedback.service');

const pub = {};

/**
 * 分页列出课程笃师一对一反馈列表
 *
 * @param req
 * @param res
 */
pub.queryPagedClazzFeedbacks = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.feedbackQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzFeedbackService.queryPagedFeedbacks(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize, queryParam.status, queryParam.keyword)
            .then((queryResult) => {
              const feedbackIds = _.map(queryResult.values, 'id');

              return clazzFeedbackService.countFeedbackReplies(feedbackIds)
                  .then((feedbackCountMap) => {
                    debug(feedbackCountMap);

                    _.forEach(queryResult.values, (clazzFeedback) => {
                      clazzFeedback.replyCount = _.get(feedbackCountMap, clazzFeedback.id, 0);
                    });

                    return queryResult;
                  })
            });
      })
      .then((result) => {
        // 数据筛选
        result.values = _.map(result.values, (clazzFeedback) => _.pick(clazzFeedback, ['id', 'status', 'user', 'feedbackRound', 'replyCount']));
        // render数据
        return apiRender.renderPageResult(res, result.values, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 管理员回复大反馈
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.replyClazzFeedback = (req, res) => {
  const currentFeedbackItem = req.__CURRENT_CLAZZ_FEEDBACK;

  return schemaValidator.validatePromise(clazzSchema.feedbackReplySchema, req.body)
      .then((replyItem) => {
        debug(replyItem);

        const adminInfo = _.pick(req.__CURRENT_ADMIN, ['id', 'name', 'headImgUrl']);
        adminInfo.isSelf = true;

        return clazzFeedbackService.adminReplyFeedback(currentFeedbackItem, replyItem, adminInfo, req.__CURRENT_CLAZZ);
      })
      .then((replyItem) => {
        debug(replyItem);

        return apiRender.renderBaseResult(res, replyItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询大点评消息列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryFeedbackReplyList = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ;

  return schemaValidator.validatePromise(clazzSchema.feedbackReplyQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzFeedbackService.queryFeedbackReplyList(req.__CURRENT_CLAZZ_FEEDBACK, null, currentClazzItem, queryParam.pageSize, new Date(), true);
      })
      .then((replyList) => {
        debug(replyList);

        return apiRender.renderBaseResult(res, replyList);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
