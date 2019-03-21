'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');

const apiUtil = require('../util/api.util');

const guideService = require('../../services/guide.service');

const pub = {};

/**
 * 获取互动页面消息列表
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchInteractiveChatList = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return guideService.fetchAllInteractiveGuideChat(req.__CURRENT_USER, { headImgUrl: 'http://qiniuprivate.gambition.cn/rgHxWu_uband_logo.png' });
      })
      .then((chatList) => {
        debug(chatList);

        const pickedChatList = _.map(chatList, apiUtil.pickGuideChatBasicInfo);

        debug(pickedChatList);

        return apiRender.renderBaseResult(res, pickedChatList);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
