'use strict';

const multiline = require('multiline');
/**
 * 为post增加stickied字段，默认false
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `post`
     ADD `stickied` TINYINT(2)
     NULL
     DEFAULT '0'
     COMMENT '是否置顶'
     AFTER `result`
     */
  }))
};

/**
 * 去除stickied字段
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `post`
     DROP COLUMN `stickied`
     */
  }));
};
