'use strict';

/**
 * 新建admin permission表 -- 管理员权限
 */

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `admin_permission` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `adminId` int(11) unsigned NOT NULL,
     `clazzId` char(32) DEFAULT NULL,
     `permissionType` char(32) DEFAULT NULL,
     `permissionName` char(32) NOT NULL DEFAULT '',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw('DROP TABLE admin_permission;');
};
