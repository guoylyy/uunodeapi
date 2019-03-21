'use strict';

/**
 * 为user表增加realName字段
 */

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user` ADD `realName` CHAR(32)
     NULL
     DEFAULT NULL
     AFTER `phoneNumber`
     */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user` DROP COLUMN `realName`;
     */
  }));
};
