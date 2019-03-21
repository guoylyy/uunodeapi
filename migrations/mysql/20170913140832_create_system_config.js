'use strict';

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  const createSystemConfigPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
      CREATE TABLE `system_config` (
      `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
      `type` char(64) DEFAULT NULL,
      `key` char(64) DEFAULT NULL,
      `value` varchar(255) DEFAULT NULL,
      `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
      `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
      PRIMARY KEY (`id`),
      UNIQUE KEY `system_config_unique_type_key` (`type`,`key`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return createSystemConfigPromise;
};

exports.down = function (knex, Promise) {
  const dropystemConfigPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE system_config;
     */
  }));

  return dropystemConfigPromise;
};
