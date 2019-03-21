'use strict';

/**
 * user表增加birthday及timezoneUpdated
 */

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     ADD `birthday` DATE NULL COMMENT '用户生日' AFTER `city`,
     ADD `timezoneUpdated` INT(11) UNSIGNED NULL COMMENT '更新时区次数' AFTER `hasFillInfo`
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('ALTER TABLE `user` DROP COLUMN `birthday`, DROP COLUMN `timezoneUpdated`;');
};
