'use strict';

/**
 * 用户相关API
 */

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const commonSchema = require('../common.schema');
const enumModel = require('../../services/model/enum');
const schoolService = require('../../services/school.service');
const userFileService = require('../../services/userFile.service');

const pub = {};

/**
 * 查询学校
 *
 * @param req
 * @param res
 */
pub.querySchools = (req, res) =>{
  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((queryParam) =>{
        return schoolService.querySchool(req.query.name);
      })
      .then((schools) => {
        return apiRender.renderBaseResult(res, schools);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取系统枚举配置
 * @param req
 * @param res
 */
pub.getSystemEnums = (req, res) =>{
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((params) =>{
        //1.获取枚举key
        let key = req.query['key'];
        if(_.isNil(key)){
          return apiRender.renderError(res, "没有设置查询参数");
        }
        if(_.isNil(enumModel[key])){
          return apiRender.renderNotFound(res);
        }else{
          //2.返回枚举情况
          return apiRender.renderBaseResult(res, enumModel[key]);
        }
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取attach对象包含url
 */
pub.getUserFile = (req, res) =>{
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.userFileId)
      .then((userFileId) =>{
        return userFileService.fetchUserFileById(userFileId);
      })
      .then(userFile => {
        if (_.isNil(userFile)) {
          return apiRender.renderNotFound(res);
        } else if (userFile.userId != req.__CURRENT_USER.id) {
          return apiRender.renderUnauthorized(res);
        }
        return apiRender.renderBaseResult(res, userFile);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
