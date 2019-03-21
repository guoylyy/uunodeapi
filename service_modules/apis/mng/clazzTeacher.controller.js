'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const winston = require('winston');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const teacherSchema = require('./schema/clazzTeacher.schema');


const clazzTeacherService = require('../../services/clazzTeacher.service');

const pub = {};

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
    if(queryParam.pageSize == 10 || queryParam == undefined){
      queryParam.pageSize = 30;
    }
  return clazzTeacherService.fetchPagedClazzTeachers(queryParam.pageNumber, queryParam.pageSize);
})
.then((pagedTeacher) => {

    const pickedTeacherList = _.map(
        pagedTeacher.values,
        (teacherItem) => _.pick(
        teacherItem,
        ['id', 'name', 'headImgUrl']
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
