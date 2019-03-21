'use strict';

/**
 * 新建admin表 -- 管理员
 */

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `admin` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `phoneNumber` char(16) NOT NULL DEFAULT '',
     `name` varchar(32) DEFAULT NULL,
     `role` char(32) DEFAULT NULL,
     `saltPassword` varchar(128) DEFAULT NULL,
     `headImgUrl` varchar(256) DEFAULT NULL,
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `unique_phoneNumber` (`phoneNumber`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw('DROP TABLE admin;');
};
