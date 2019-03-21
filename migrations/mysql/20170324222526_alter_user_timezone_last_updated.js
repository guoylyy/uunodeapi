'use strict';

/**
 * user表修改timezoneUpdated为timezoneUpdatedAt
 */

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     CHANGE `timezoneUpdated` `timezoneUpdatedAt` TIMESTAMP NULL COMMENT '更新时区时间'
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     CHANGE `timezoneUpdatedAt` `timezoneUpdated` INT(11) UNSIGNED NULL COMMENT '更新时区次数'
     */
  }));
};
