'use strict';

/**
 * clazz_accunt表增加bill详情
 */

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `post` ADD `result` TEXT
     NULL
     COMMENT '推送结果'
     AFTER `target`
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('ALTER TABLE `post` DROP COLUMN `result`;');
};
