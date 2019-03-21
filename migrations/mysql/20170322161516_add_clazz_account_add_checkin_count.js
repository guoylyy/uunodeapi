'use strict';

/**
 * clazz_account表增加addCheckinCount
 */

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account` ADD `addCheckinCount` INT(11)
     UNSIGNED
     NULL
     DEFAULT NULL
     COMMENT '补打卡次数记录器'
     AFTER `clazzId`
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('ALTER TABLE `clazz_account` DROP COLUMN `addCheckinCount`;');
};
