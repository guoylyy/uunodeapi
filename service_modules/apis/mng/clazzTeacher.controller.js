'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const winston = require('winston');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const teacherSchema = require('./schema/clazzTeacher.schema');
const commonSchema = require('../common.schema');

const clazzTeacherService = require('../../services/clazzTeacher.service');

const pub = {};

/**
 * 更新笃师信息
 */
pub.updateTeacherInfomation = (req, res) =>{

  return schemaValidator.validatePromise(teacherSchema.updateTeacherInfoSchema, req.body)
      .then((teacherItem) => {
        winston.info('id', req.params.id);
        return clazzTeacherService.updateClazzTeacher(req.params.id, teacherItem);
      })
      .then((item)=>{
        return  apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);

};


/**
 * 查询单个笃师的详细信息
 */
pub.fetchTeacherInfo = (req, res) =>{
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then(() => {
        winston.info('id', req.params.id);
        return clazzTeacherService.fetchClazzTeacherById(req.params.id);
      })
      .then((item)=>{
        return  apiRender.renderBaseResult(res, _.pick(item,['id','name','headImgUrl','tags','description']));
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 删除单个笃师的信息(暂时不支持）
 */

/**
 * 新增笃师信息
 */
pub.createTeacher = (req, res) =>{
  return schemaValidator.validatePromise(teacherSchema.createTeacherSchema, req.body)
      .then((teacherItem) => {

        winston.info('Create Teacher', teacherItem);
        return clazzTeacherService.createTeacher(teacherItem);
      })
      .then((item)=>{
        return  apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 分页获取笃师列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchPagedTeacherList = (req, res) => {
  return schemaValidator.validatePromise(teacherSchema.teacherListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        if (queryParam.pageSize == 10 || queryParam == undefined) {
          queryParam.pageSize = 30;
        }
        return clazzTeacherService.fetchPagedClazzTeachers(queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedTeacher) => {

        const pickedTeacherList = _.map(
            pagedTeacher.values,
            (teacherItem) => _.pick(
                teacherItem,
                ['id', 'name', 'headImgUrl', 'description', 'tags']
            )
        );
        return apiRender.renderPageResult(
            res,
            pickedTeacherList,
            pagedTeacher.itemSize,
            pagedTeacher.pageSize,
            pagedTeacher.pageNumber
        );
      })
      .catch(req.__ERROR_HANDLER);
};


module.exports = pub;
