'use strict';

const multiline = require('multiline');
/**
 * 为 user_pay 增加 bill 字段
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user_pay`
     ADD `bill` TEXT
     NULL
     COMMENT '支付账单'
     AFTER `objectId`
     */
  }))
};

/**
 * 去除 user_pay 的 bill 字段
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user_pay`
     DROP COLUMN `bill`
     */
  }));
};
