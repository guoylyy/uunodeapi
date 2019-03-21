'use strict';

/**
 * admin表增加token及token过期信息
 */

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `admin`
     ADD `authToken` TEXT NULL AFTER `headImgUrl`,
     ADD `authExpire` DATETIME NULL AFTER `authToken`
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('ALTER TABLE `admin` DROP COLUMN `authToken`, DROP COLUMN `authExpire`;');
};
