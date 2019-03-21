'use strict';

/**
 * 新建 post 表，课程推送消息
 */

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `post` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `title` varchar(64) DEFAULT NULL COMMENT '任务标题，当postType为CLAZZ_TASK时与target所引用的任务标题一致，其他情况则作显示用途',
     `status` char(32) DEFAULT NULL COMMENT 'post状态',
     `clazzId` char(32) DEFAULT NULL COMMENT '班级id',
     `postType` char(32) DEFAULT NULL COMMENT '推送类型，支持LINK及CLAZZ_TASK',
     `targetDate` datetime DEFAULT NULL COMMENT '具体推送时间',
     `target` text COMMENT '推送目标， 当postType为CLAZZ_TASK时为taskId，LINK时为url',
     `objectId` varchar(32) DEFAULT NULL COMMENT 'legacy',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw('DROP TABLE post;');
};
