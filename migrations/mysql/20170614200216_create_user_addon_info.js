'use strict';

const multiline = require('multiline');

/**
 * 新建 user_addon_info 用户额外信息
 * @param knex
 * @param Promise
 */

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_addon_info` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `userId` int(11) unsigned DEFAULT NULL COMMENT '用户Id，参见user',
     `qrcode` text COMMENT '微信推广二维码',
     `qrcodeAttachId` char(32) DEFAULT NULL COMMENT '微信推广二维码attachId',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `user_addon_info_unique_user_id` (`userId`)
     ) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
     */
  }))
};

exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE user_addon_info;
     */
  }));
};
