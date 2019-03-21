'use strict';

const _ = require('lodash');
const winston = require('winston');
const debug = require('debug')('service');
const Promise = require('bluebird');
const bcrypt = require('bcrypt');

const systemConfig = require('../../config/config');
const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const clazzService = require('./clazz.service');

const adminMapper = require('../dao/mysql_mapper/admin.mapper');
const adminPermissionMapper = require('../dao/mysql_mapper/adminPermission.mapper');

const comparePasswordPromise = Promise.promisify(bcrypt.compare);
const hashPasswordPromise = Promise.promisify(bcrypt.hash);

const clazzPermissionKey = enumModel.permissionTypeEnum.CLAZZ_PERMISSION.key;
const systemPermissionKey = enumModel.permissionTypeEnum.SYSTEM_PERMISSION.key;

let pub = {};

/**
 * 管理员登录
 *
 * @param phoneNumber
 * @param password
 */
pub.adminLogin = (phoneNumber, password) => {
  let globalAdminItem;
  return adminMapper.fetchByParam({ phoneNumber: phoneNumber })
      .then((adminItem) => {
        // 如果用户不存在则返回错误消息
        if (_.isNil(adminItem)) {
          return Promise.reject(commonError.PARAMETER_ERROR('用户名或密码错误'));
        }

        debug(adminItem);
        globalAdminItem = adminItem;

        debug(password);
        debug(adminItem.saltPassword);

        return comparePasswordPromise(password, adminItem.saltPassword);
      })
      .then((isValidPassword) => {
        debug(isValidPassword);
        // 密码校验失败
        if (isValidPassword !== true) {
          return Promise.reject(commonError.PARAMETER_ERROR('用户名或密码错误'));
        }

        return globalAdminItem;
      });
};

/**
 * 根据id获取管理员基本信息
 *
 * @param id
 * @returns {Promise}
 */
pub.fetchAdminById = (id) => {
  return adminMapper.fetchByParam({ id: id });
};

/**
 * 新建管理员
 *
 * @param adminItem
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.createAdmin = (adminItem) => {
  debug(adminItem);

  return adminMapper.fetchByParam({ phoneNumber: adminItem.phoneNumber })
      .then((existedAdminItem) => {
        if (!_.isNil(existedAdminItem)) {
          return Promise.reject(commonError.PARAMETER_ERROR('该手机号已被注册，请直接登录'));
        }

        return hashPasswordPromise(adminItem.password, systemConfig.USER_OPTIONS.saltRounds);
      })
      .then((hashedPassword) => {
        adminItem.saltPassword = hashedPassword;

        // 去除不需要的字段
        delete adminItem.password;

        return adminMapper.create(adminItem);
      });
};

/**
 * 获取管理员权限
 *
 * @param adminId
 * @returns {Promise.<TResult>|Promise}
 */
pub.fetchAdminPermissions = (adminId) => {
  return adminPermissionMapper.queryAll({ adminId: adminId })
      .then((permissionList) => {
        const permissionMap = _.groupBy(permissionList, 'permissionType');

        // 过滤掉非法的权限
        const clazzPermissionList = _.filter(permissionMap[clazzPermissionKey], (permissionItem) => {
              return !_.isNil(enumModel.getEnumByKey(permissionItem.permissionName, enumModel.permissionEnum.CLAZZ_PERMISSION));
            }),
            systemPermissionList = _.filter(permissionMap[systemPermissionKey], (permissionItem) => {
              return !_.isNil(enumModel.getEnumByKey(permissionItem.permissionName, enumModel.permissionEnum.SYSTEM_PERMISSION));
            });

        debug(clazzPermissionList);
        debug(systemPermissionList);

        const systemPermissionNameList = _.map(systemPermissionList, 'permissionName'),
            clazzPermissionNameMap = _.reduce(
                _.groupBy(clazzPermissionList, 'clazzId'),
                (result, permissionList, clazzId) => {
                  result[clazzId] = _.map(permissionList, 'permissionName');
                  return result;
                },
                {}
            );

        debug(clazzPermissionNameMap);
        debug(systemPermissionList);

        const adminPermissionMap = {};
        adminPermissionMap[systemPermissionKey] = systemPermissionNameList;
        adminPermissionMap[clazzPermissionKey] = clazzPermissionNameMap;

        return adminPermissionMap;
      })
};

/**
 * 设置管理员系统权限
 *
 * @param adminId
 * @param permissionList
 * @returns {*}
 */
pub.setAdminSystemPermission = (adminId, permissionList) => {
  let adminPermissionList = _.map(permissionList, (permission) => {
    return {
      adminId: adminId,
      permissionType: systemPermissionKey,
      permissionName: permission
    }
  });

  return adminPermissionMapper.resetAdminPermission(
      {
        adminId: adminId,
        permissionType: systemPermissionKey
      },
      adminPermissionList
  );
};

/**
 * 设置管理员班级权限
 * 2017-07-20 现有系统只设置班级级别的权限
 *
 * @param adminId
 * @param clazzIdList
 * @returns {Promise.<TResult>}
 */
pub.setAdminClazzPermission = (adminId, clazzIdList) => {
  return clazzService.queryClazzes(null, clazzIdList, null, null)
      .then((clazzList) => {
        debug(clazzList);

        if (_.size(clazzList) !== _.size(clazzIdList)) {
          return Promise.reject(commonError.PARAMETER_ERROR('班级Id列表参数错误'));
        }

        const adminPermissionList = _.map(clazzIdList, (clazzId) => {
          return {
            adminId: adminId,
            clazzId: clazzId,
            permissionType: clazzPermissionKey,
            permissionName: enumModel.permissionEnum.CLAZZ_PERMISSION.CLAZZ_QUERY.key // 固定为班级查询权限，现有系统只设置班级级别的权限
          }
        });

        return adminPermissionMapper.resetAdminPermission(
            {
              adminId: adminId,
              permissionType: clazzPermissionKey
            },
            adminPermissionList
        );
      });
};

/**
 * 更新管理员信息
 *
 * @param adminItem
 * @returns {*}
 */
pub.updateAdmin = (adminItem) => {
  if (!_.isPlainObject(adminItem) || _.isNil(adminItem.id)) {
    winston.error('更新管理员信息失败，参数错误！ adminItem: %j', adminItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(adminItem);

  return adminMapper.update(adminItem);
};

/**
 * 使用旧密码更新管理员密码
 *
 * @param adminItem
 * @param oldPassword
 * @param newPassword
 * @returns {Promise.<TResult>}
 */
pub.updateAdminPasswordByOldPassword = (adminItem, oldPassword, newPassword) => {
  return comparePasswordPromise(oldPassword, adminItem.saltPassword)
      .then((isValidPassword) => {
        debug(isValidPassword);

        if (isValidPassword !== true) {
          return Promise.reject(commonError.PARAMETER_ERROR('原始密码错误'));
        }

        return hashPasswordPromise(newPassword, systemConfig.USER_OPTIONS.saltRounds);
      })
      .then((hashedPassword) => {
        return adminMapper.update({
          id: adminItem.id,
          saltPassword: hashedPassword
        });
      });
};

/**
 * 分页获取管理员列表
 *
 * @param pageNumber
 * @param pageSize
 * @returns {*}
 */
pub.fetchPagedAdmins = (pageNumber = 1, pageSize = 10) => {
  if (!_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return adminMapper.queryPageAdmins({}, pageNumber, pageSize);
};

/**
 * 获取班级助手列表
 *
 * @param clazzId
 * @returns {Promise.<TResult>|Promise}
 */
pub.fetchClazzAssistantList = (clazzId) => {
  if (_.isNil(clazzId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return adminPermissionMapper.queryAll({ clazzId: clazzId })
      .then((permissionList) => {
        const adminIdList = _.map(permissionList, 'adminId');

        return adminMapper.queryAll({ id: adminIdList });
      })
};

module.exports = pub;
