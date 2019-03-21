'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');

const systemConfig = require('../../../config/config');

const commonError = require('../../services/model/common.error');
const commonUtil = require('../../services/util/common.util');
const enumModel = require('../../services/model/enum');

const apiRender = require('../render/api.render');
const webUtil = require('../util/web.util');

const userFileService = require('../../services/userFile.service');

let pub = {};

const SUPPORT_DOMAINS = _.keys(systemConfig.CHECKIN_SUPPORT_DOMAIN);
/**
 * 创建用户打卡文件
 *  -- 现只支持外链打卡
 * @param req
 * @param res
 */
pub.createCheckinFile = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.createCheckinFileBodySchema, req.body)
      .then((checkinFileItem) => {
        debug(checkinFileItem);

        const supportedDomains = _.filter(SUPPORT_DOMAINS, (domain) => checkinFileItem.url.indexOf(domain) > 0);

        if (_.isEmpty(supportedDomains)) {
          return Promise.reject(commonError.PARAMETER_ERROR('不支持的外链地址'));
        }

        const userFileItem = {
          openId: req.__CURRENT_USER.openId,
          hasCheckined: false,
          userId: req.__CURRENT_USER.id,
          upTime: new Date(),
          fileType: enumModel.fileTypeEnum.weblink.key,
          format: 'text',
          fileUrl: checkinFileItem.url,
          fileName: moment().format('YYYY-MM-DD HH:mm:ss'),
          fileKey: commonUtil.generateRandomKey()
        };

        return userFileService.createUserFile(userFileItem);
      })
      .then((userFileItem) => {
        debug(userFileItem);

        return apiRender.renderBaseResult(res, webUtil.pickUserFileBasicInfo(userFileItem));
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
