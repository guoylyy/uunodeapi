'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const apiRender = require('../render/api.render');
const apiUtil = require('../util/api.util');

const commonSchema = require('../common.schema');
const clazzNotificationSchema = require('./schema/clazzNotification.schema');

const wechatTemplateMessage = require('../../lib/wechat.template.message');
const wechatTemplateReply = require('../../lib/wechat.template.reply');

const clazzService = require('../../services/clazz.service');
const clazzAccountService = require('../../services/clazzAccount.service');

const pub = {};

/**
 * 新建班级推送消息
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.createClazzNotification = (req, res) => {
  const currentClazzId = req.__CURRENT_CLAZZ.id;
  // 记录器
  let globalTitle, globalRemark, globalUrl, status;

  return schemaValidator.validatePromise(clazzNotificationSchema.createClazzNotificationBodySchema, req.body)
      .then((notificationItem) => {
        debug(notificationItem);

        const clazzName = req.__CURRENT_CLAZZ.name;

        globalTitle = notificationItem.title + '\n';
        globalRemark = '\n' + notificationItem.remark;
        globalUrl = notificationItem.url;
        status = notificationItem.status;

        return clazzAccountService.searchClazzUsers(currentClazzId, [status], null, [])
            .then((userList) => {
              return _.map(userList, (userItem) => {
                return wechatTemplateMessage.ADVERTISEMENT(userItem.openId, globalTitle, globalRemark, clazzName, userItem.name, globalUrl);
              })
            });
      })
      .then((notificationList) => {
        debug(notificationList);

        return wechatTemplateReply.pushTemplateMessageList(notificationList);
      })
      .then((countMap) => {
        debug(countMap);

        return clazzService.createClazzNotification(
            currentClazzId,
            status,
            globalTitle,
            globalRemark,
            globalUrl,
            countMap[true],
            countMap[false]
        );
      })
      .then((clazzNotificationItem) => {
        debug(clazzNotificationItem);

        // 过滤条目信息
        const pickedNotificationItem = apiUtil.pickClazzNotification(clazzNotificationItem);

        return apiRender.renderBaseResult(res, pickedNotificationItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 分页查询推送消息列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryPagedClazzNotifications = (req, res) => {
  return schemaValidator.validatePromise(clazzNotificationSchema.clazzNotificationQuerySchema, req.query)
      .then((queryParam) => {
        return clazzService.queryPagedClazzNotificationList(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedClazzNotification) => {
        // 过滤条目信息
        const pickedNotificationList = _.map(
            pagedClazzNotification.values,
            (item) => _.pick(item, ['id', 'clazzJoinStatus', 'title', 'success', 'fail', 'pushAt'])
        );

        return apiRender.renderPageResult(
            res,
            pickedNotificationList,
            pagedClazzNotification.itemSize,
            pagedClazzNotification.pageSize,
            pagedClazzNotification.pageNumber
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取推送详情
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchClazzNotificationItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzService.fetchClazzNotificationById(req.params.notificationId);
      })
      .then((notificationItem) => {
        if (_.isNil(notificationItem) || notificationItem.clazz !== req.__CURRENT_CLAZZ.id) {
          return apiRender.renderNotFound(res);
        }
        // 过滤条目信息
        const pickedNotificationItem = apiUtil.pickClazzNotification(notificationItem);

        return apiRender.renderBaseResult(res, pickedNotificationItem);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
