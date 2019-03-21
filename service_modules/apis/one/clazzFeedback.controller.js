'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');

const enumModel = require('../../services/model/enum');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const userService = require('../../services/user.service');
const clazzFeedbackService = require('../../services/clazzFeedback.service');
const clazzFeedbackMaterialService = require('../../services/clazzFeedbackMaterial.service');

const wechatTemplateReply = require('../../lib/wechat.template.reply');

const pub = {};

/**
 * 更新笃师一对一反馈状态
 *  并通知用户
 * @param req
 * @param res
 */
pub.updateFeedbackStatus = (req, res) => {
  let isNotify = false; // 记录是否通知用户
  schemaValidator.validatePromise(clazzSchema.updateFeedbackStatusBodySchema, req.body)
      .then((feedbackStatusItem) => {
        debug(feedbackStatusItem);

        isNotify = feedbackStatusItem.isNotify;

        const updatingFeedbackItem = {
          status: feedbackStatusItem.status
        };

        if (feedbackStatusItem.status === enumModel.clazzFeedbackStatusEnum.REPLIED.key) {
          const clazzFeedbackRound = _.get(req.__CURRENT_CLAZZ, 'configuration.feedbackRound', 0), // 班级配置中的反馈轮数
              currentFeedbackRound = req.__CURRENT_CLAZZ_FEEDBACK.feedbackRound || 0; // 用户当前反馈轮数

          debug(clazzFeedbackRound);
          debug(currentFeedbackRound);

          // 如果不大于班级反馈轮数，则当前反馈书自增
          if (currentFeedbackRound < clazzFeedbackRound) {
            updatingFeedbackItem.feedbackRound = currentFeedbackRound + 1;
          }
        }

        debug(updatingFeedbackItem);

        return clazzFeedbackService.updateClazzFeedbackStatus(req.__CURRENT_CLAZZ_FEEDBACK.id, updatingFeedbackItem);
      })
      .then((updatedFeedbackItem) => {
        debug(updatedFeedbackItem);

        if (isNotify === true) {
          userService.fetchById(req.__CURRENT_CLAZZ_FEEDBACK.userId)
              .then((userItem) => {
                wechatTemplateReply.sendReplySuccessMsg(userItem, req.__CURRENT_CLAZZ);
              })
              .catch(winston.error)
        }

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
