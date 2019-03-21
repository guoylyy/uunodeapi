'use strict';

/**
 * user数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

const Promise = require('bluebird');
const winston = require('winston');
const debug = require('debug')('mapper');

const bookshelf = require('../mysql.connection');
const queryUtil = require('../util/queryUtil');
const adminPermissionSchema = require('./schema/adminPermission.schema');

const PermissionCollection = bookshelf.Collection.extend({ model: adminPermissionSchema });

const defaultSelectColumns = ['id', 'adminId', 'clazzId', 'permissionType', 'permissionName'];

let pub = {};

/**
 * 查询用户列表
 *
 * @param queryParam
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryAll = (queryParam) => {
  let safeParams = ['id', 'adminId', 'clazzId'];

  return adminPermissionSchema.query(
      (query) => {
        queryUtil.filterMysqlQueryParam(query, queryParam, safeParams);
      })
      .fetchAll({ columns: defaultSelectColumns })
      .then((permissionList) => {
            debug(permissionList);
            if (!permissionList) {
              return [];
            }

            return permissionList.toJSON();
          }
      )
};

/**
 * 重新设置管理员权限
 *
 * @param queryParam
 * @param permissions
 * @returns {*}
 */
pub.resetAdminPermission = (queryParam, permissions) => {
  let safeParams = ['adminId', 'permissionType'];

  let query = queryUtil.filterMysqlQueryParam(adminPermissionSchema, queryParam, safeParams);

  return bookshelf.transaction((t) => {
    return query.destroy({ transacting: t })
        .then((permissionList) => {
          debug(permissionList);
          let permissionCollections = PermissionCollection.forge(permissions);

          return permissionCollections.invokeThen('save', null, { transacting: t });
        })
  });
};

module.exports = pub;
