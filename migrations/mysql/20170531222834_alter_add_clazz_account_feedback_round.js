'use strict';

const multiline = require('multiline');
/**
 * 为 clazz_account 增加 feedbackRound 及 easemobFriendCount 字段，默认 0
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account`
     ADD `feedbackRound` INT
     UNSIGNED
     NULL
     DEFAULT '0'
     COMMENT '笃师反馈轮数计数器'
     AFTER `endDate`,
     ADD `easemobFriendCount` INT
     UNSIGNED
     NULL
     DEFAULT '0'
     COMMENT '班级友伴计数器'
     AFTER `endDate`
     */
  }))
};

/**
 * 去除 feedbackRound 及 easemobFriendCount 字段
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account`
     DROP COLUMN `feedbackRound`,
     DROP COLUMN `easemobFriendCount`
     */
  }));
};
