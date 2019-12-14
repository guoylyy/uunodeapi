/**
 * 首页管理相关API
 */
'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const advEntitySchema = require('./schema/advEntity.schema');

const systemConfig = require('../../../config/config');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const advService = require('../../services/advEntity.service');

const jwtUtil = require('../util/jwt.util');
const apiUtil = require('../util/api.util');

const pub = {};

/**
 * 获取所有的Entity
 * @param req
 * @param res
 */
pub.fetchAllAdvs = (req, res)=>{
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then(()=>{
          return advService.queryAllAdv();
      })
      .then((results)=>{

          let groupResult = _.groupBy(results, (item)=>{
            return _.get(item,'type');
          })
          return apiRender.renderBaseResult(res, groupResult);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 获取单个Entity
 * @param req
 * @param res
 */
pub.fetchAdvEntity = (req, res) =>{
  return schemaValidator.validatePromise(advEntitySchema.advSchema, req.params)
      .then((param)=>{
        let id = _.get(param, 'advId');
        return advService.queryAdvById(id);
      })
      .then((results)=>{

        if(!_.isNil(results)){
          return apiRender.renderBaseResult(res, results[0]);
        }else{
          return apiRender.renderNotFound(res);
        }
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 新建一个Entity
 * @param req
 * @param res
 */
pub.createNewAdvEntity = (req,res)=>{
  return schemaValidator.validatePromise(advEntitySchema.createAdvSchema, req.body)
      .then((param)=>{
        return advService.createAdv(param);
      })
      .then((result)=>{
        if(_.isNil(result)){
          return apiRender.renderBizFail(res);
        }else{
          return apiRender.renderBaseResult(res, result);
        }
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 更新一个Entity
 * @param req
 * @param res
 */
pub.updateAdvEntity = (req,res)=>{

  return schemaValidator.validatePromise(advEntitySchema.updateAdvSchema, req.body)
      .then((advItem)=>{
        let id = req.params.advId;

        if(_.isNil(id)){
          return apiRender.renderNotFound(res);
        }

        advItem['id'] = id;
        return advService.updateAdv(advItem);
      })
      .then((result)=>{
        if(_.isNil(result)){
          return apiRender.renderBizFail(res);
        }else{
          return apiRender.renderSuccess(res);
        }
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 删除一个Entity
 * @param req
 * @param res
 */
pub.removeAdvEntity = (req,res)=>{
  return schemaValidator.validatePromise(advEntitySchema.advSchema, req.params)
      .then((param)=>{
        let id = _.get(param, 'advId');
        return advService.deleteById(id);
      })
      .then((results)=>{
        if(results.code == 500){
          return apiRender.renderSuccess(res);
        }else{
          return apiRender.renderSuccess(res);
        }
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};
module.exports = pub;
