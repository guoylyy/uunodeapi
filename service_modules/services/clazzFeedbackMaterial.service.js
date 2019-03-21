'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const winston = require('winston');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const clazzFeedbackMaterialMapper = require('../dao/mongodb_mapper/clazzFeedbackMaterial.mapper');

let pub = {};

/**
 * 分页获取课程反馈素材
 *
 * @param clazzId     课程id
 * @param pageNumber  页码
 * @param pageSize    页面大小
 * @param keyword     关键词
 * @returns {*}
 */
pub.queryPagedFeedbackMaterials = (clazzId, pageNumber, pageSize, keyword) => {
  if (_.isNil(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('分页获取课程反馈素材列表失败，参数错误！！！\n\tclazzId: %s\n\tpageNumber: %s\n\tpageSize: %s', clazzId, pageNumber, pageSize);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(clazzId);
  debug(pageNumber);
  debug(pageSize);
  debug(keyword);


  pageNumber = pageNumber || 1;
  pageSize = pageSize || 10;

  let queryParam = { clazz: clazzId };
  if (!_.isNil(keyword) && keyword !== '') {
    queryParam.title = new RegExp(keyword);
  }

  return clazzFeedbackMaterialMapper.pageQuery(queryParam, pageNumber, pageSize)
};

/**
 * 获取反馈素材详情
 *
 * @param materialId
 * @returns {*}
 */
pub.fetchFeedbackMaterialById = (materialId) => {
  if (_.isNil(materialId)) {
    winston.error('获取课程反馈素材详细信息失败，参数错误！！！materialId: %s', materialId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMaterialMapper.fetchById(materialId)
      .then((materialItem) => {
        debug(materialItem);

        return _.omit(materialItem, ['createdAt', 'updatedAt']);
      })
};

/**
 * 创建笃师一对一反馈素材
 *
 * @param materialItem
 * @returns {*}
 */
pub.createFeedbackMaterial = (materialItem) => {
  if (!_.isPlainObject(materialItem) || !_.isNil(materialItem.id)) {
    winston.error('新建课程反馈素材详细信息失败，参数错误！！！materialItem: %s', materialItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMaterialMapper.create(materialItem);
};

/**
 * 更新笃师一对一反馈素材
 *
 * @param materialItem
 * @returns {Promise.<*>|Promise}
 */
pub.updateFeedbackMaterial = (materialItem) => {
  if (!_.isPlainObject(materialItem) || _.isNil(materialItem.id)) {
    winston.error('更新课程反馈素材详细信息失败，参数错误！！！materialItem: %s', materialItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMaterialMapper.updateById(materialItem.id, materialItem);
};

/**
 * 移除笃师一对一反馈素材
 *
 * @param materialId
 * @returns {*}
 */
pub.deleteFeedbackMaterial = (materialId) => {
  if (_.isNil(materialId)) {
    winston.error('删除课程反馈素材详细信息失败，参数错误！！！materialId: %s', materialId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMaterialMapper.destroy(materialId);
};

module.exports = pub;
