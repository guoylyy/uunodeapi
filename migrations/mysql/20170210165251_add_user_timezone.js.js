'use strict';

/**
 * 为user表增加timezone字段
 */

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user` ADD `timezone` CHAR(32)
     NULL
     DEFAULT NULL
     COMMENT '用户时区'
     AFTER `phoneNumber`;
     */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user` DROP COLUMN `timezone`;
     */
  }));
};
