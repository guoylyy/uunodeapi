'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
      CREATE TABLE `sms_security_code` (
        `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
        `code` char(16) NOT NULL DEFAULT '' COMMENT '验证码',
        `phoneNumber` char(16) NOT NULL DEFAULT '' COMMENT '手机号',
        `expireAt` datetime NOT NULL COMMENT '失效时间',
        `codeType` char(32) NOT NULL DEFAULT '' COMMENT '类型',
        `userId` int(11) unsigned DEFAULT NULL COMMENT 'user id，关联到user',
        `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
        `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
        PRIMARY KEY (`id`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
      DROP TABLE sms_security_code;
     */
  }));
};
