'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const winston = require('winston');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const qiniuComponent = require('./component/qiniu.component');

const attachService = require('./attach.service');

const materialMapper = require('../dao/mongodb_mapper/materialLibrary.mapper');

/**
 * 为素材列表填充可访问url
 *
 * @param materialList
 * @returns {*}
 */
let fillMaterialUrl = (materialList) => {
  if (_.isEmpty(materialList)) {
    // 如果为空，返回dummy promise
    return Promise.resolve([]);
  }

  let attachIds = _.map(materialList, 'attach');

  return attachService.queryAttachList(attachIds)
      .then((attachList) => {
        let attachMap = _.keyBy(attachList, 'id');

        // 为素材增加可访问链接
        _.forEach(materialList, (material) => {
          let tempAttachItem = attachMap[material.attach];

          if (!_.isNil(tempAttachItem) && !_.isNil(tempAttachItem.url)) {
            material.attachId = tempAttachItem.id;
            material.url = tempAttachItem.url;
            material.fileType = tempAttachItem.fileType;
            material.fileSize = tempAttachItem.size;

            // 为 图片 和 视频 生成缩略图
            if (material.type === enumModel.materialTypeEnum.IMAGE.key) {
              material.thumbnailUrl = qiniuComponent.previewImage(tempAttachItem.attachType, tempAttachItem.key, 180, 200);
            } else if (material.type === enumModel.materialTypeEnum.VIDEO.key) {
              material.thumbnailUrl = qiniuComponent.previewVideo(tempAttachItem.attachType, tempAttachItem.key, 180, 200);
            }
          } else {
            material.url = null;
            material.fileType = null;
            material.fileSize = 0;

            winston.error('为素材%s设置可访问url失败！！！', material.id);
          }

          // 去除无用字段
          delete material.attach;
        });

        return materialList;
      });
};

let pub = {};

/**
 * 查询班级任务素材列表
 * 包含可访问url
 *
 * @param clazzId
 * @param materialIds
 * @returns {Promise|Promise.<*>}
 */
pub.queryClazzMaterials = (clazzId, materialIds) => {
  if (_.isNil(clazzId) && !_.isArray(materialIds)) {
    winston.error('查询任务素材列表失败，参数错误！！！clazzId: %s, materialIds: %j', clazzId, materialIds);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = {};
  if (!_.isNil(clazzId)) {
    queryParam['clazzId'] = clazzId;
  }
  if (_.isArray(materialIds)) {
    if (_.isEmpty(materialIds)) {
      return Promise.resolve([]);
    }

    queryParam['_id'] = materialIds;
  }

  // 根据id，获取素材列表
  return materialMapper.queryMaterialList(queryParam)
      .then((materialList) => {
        return fillMaterialUrl(materialList);
      });
};

/**
 * 根据materialIds复制任务素材到clazzId中
 *
 * @param clazzId
 * @param materialIds
 * @returns {Promise|Promise.<*>}
 */
pub.duplicateClazzMaterials = (clazzId, materialIds) => {
  if (_.isNil(clazzId) || !_.isArray(materialIds) || _.isEmpty(materialIds)) {
    winston.error('复制任务素材失败，参数错误！！！clazzId: %s, materialIds: %j', clazzId, materialIds);
    return Promise.reject(commonError.PARAMETER_ERROR('素材不能为空'));
  }

  // 根据ids，获取素材列表
  return materialMapper.queryMaterialList({ _id: materialIds })
      .then((materialList) => {
        debug(materialList);

        if (materialIds.length !== materialList.length) {
          return Promise.reject((commonError.PARAMETER_ERROR('素材参数有误')));
        }

        let clazzMaterials = _.map(materialList, (materialItem) => {
          return {
            clazz: clazzId,
            title: materialItem.title,
            type: materialItem.type,
            description: materialItem.description,
            attach: materialItem.attach,
          }
        });

        debug(clazzMaterials);

        return materialMapper.createAll(clazzMaterials);
      });
};

/**
 * 分页查询班级任务素材
 *
 * @param clazzId
 * @param materialType
 * @param pageNumber
 * @param pageSize
 * @param keyword
 * @returns {Promise|Promise.<*>}
 */
pub.queryPagedClazzMaterials = (clazzId, materialType, pageNumber, pageSize, keyword) => {
  let materialTypeEnum = enumModel.getEnumByKey(materialType, enumModel.materialTypeEnum);

  if (_.isNil(clazzId) || _.isNil(materialTypeEnum) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('查询班级任务分页列表失败，参数错误！！！ clazzId: %s, materialType: %s, pageNumber: %s， pageSize: %s, keyword: %s', clazzId, materialType, pageNumber, pageSize, keyword);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  let queryParam = {
    clazz: clazzId,
    type: materialType
  };

  if (!_.isNil(keyword) && keyword !== '') {
    queryParam.title = new RegExp(keyword);
  }

  let globalPagedResult;
  return materialMapper.queryPagedMaterialList(queryParam, pageNumber, pageSize)
      .then((pagedResult) => {
        globalPagedResult = pagedResult;

        debug(globalPagedResult);

        return fillMaterialUrl(globalPagedResult.values);
      })
      .then((materialList) => {
        globalPagedResult.values = materialList;

        return globalPagedResult;
      })
};

/**
 * 新建课程任务
 *
 * @param materialItem
 * @returns {*}
 */
pub.createClazzMaterial = (materialItem) => {
  if (!_.isPlainObject(materialItem) || !_.isNil(materialItem.id) || _.isNil(materialItem.clazz)) {
    winston.error('创建班级任务素材失败，参数错误！！！ materialItem: %j', materialItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(materialItem);

  return materialMapper.create(materialItem);
};

/**
 * 删除课程任务
 *
 * @param materialId
 * @returns {*}
 */
pub.deleteClazzMaterial = (materialId) => {
  if (_.isNil(materialId)) {
    winston.error('删除班级任务素材失败，参数错误！！！ materialId: %j', materialId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(materialId);

  return materialMapper.destroy(materialId);
};

module.exports = pub;
