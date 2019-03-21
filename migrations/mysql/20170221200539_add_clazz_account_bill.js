'use strict';

/**
 * clazz_accunt表增加bill详情
 */

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account` ADD `bill` TEXT
     NULL
     COMMENT 'bill详情，用户付款情况'
     AFTER `wechatInfo`
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('ALTER TABLE `clazz_account` DROP COLUMN `bill`;');
};
