'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user_bind`
     ADD `taskGuide` tinyint(1)
     NULL
     DEFAULT 0
     COMMENT '任务详情是否引导 0 未引导 1 已引导'
     AFTER `password`
     */
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user_bind`
     DROP COLUMN `taskGuide`
     */
  }))
};
