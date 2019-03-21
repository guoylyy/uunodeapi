'use strict';

const multiline = require('multiline');
/**
 * 为 post user isSubscribe 字段，默认true
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     ADD `isSubscribe` TINYINT(2)
     UNSIGNED
     NULL
     DEFAULT '1'
     COMMENT '是否关注公众号'
     AFTER `objectId`
     */
  }))
};

/**
 * 去除 isSubscribe 字段
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     DROP COLUMN `isSubscribe`
     */
  }));
};
