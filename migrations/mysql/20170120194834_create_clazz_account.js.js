'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  let createClazzAccountTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `clazz_account` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
     `wechatInfo` text COMMENT 'wechat信息',
     `status` char(16) DEFAULT NULL COMMENT '加班状态',
     `joinDate` datetime DEFAULT NULL COMMENT '加班日期',
     `invitations` text COMMENT '邀请人员列表',
     `objectId` varchar(32) DEFAULT NULL COMMENT 'objectId, legacy',
     `userId` int(11) unsigned DEFAULT NULL COMMENT 'userId，参见user',
     `userObjectId` varchar(32) DEFAULT NULL COMMENT '用户 objectId',
     `clazzId` char(32) DEFAULT NULL COMMENT '班级Id， 在mongodb中',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `clazz_unique` (`userId`,`clazzId`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return Promise.all([
    createClazzAccountTablePromise
  ]);
};

exports.down = function(knex, Promise) {
  let dropClazzAccountTablePromise = knex.schema.raw('DROP TABLE clazz_account;');

  return Promise.all([
    dropClazzAccountTablePromise
  ]);
};
