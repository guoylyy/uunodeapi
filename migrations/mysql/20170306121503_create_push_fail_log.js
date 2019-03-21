'use strict';

/**
 * 新建 push_fail_log 表，推送失败记录
 */

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `push_fail_log` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `userId` int(11) unsigned DEFAULT NULL COMMENT '用户id',
     `clazzId` char(32) DEFAULT NULL COMMENT '班级id，冗余字段，便于查询',
     `postId` int(11) unsigned DEFAULT NULL COMMENT '推送任务id，冗余字段，便于查询',
     `template` text COMMENT '推送内容',
     `error` text COMMENT '错误消息',
     `hasResend` tinyint(2) DEFAULT NULL COMMENT '是否重新推送过',
     `objectId` varchar(32) DEFAULT NULL COMMENT 'legacy',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw('DROP TABLE push_fail_log;');
};
