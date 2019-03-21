'use strict';

const multiline = require('multiline');
/**
 * 新建班级账户账单记录表，用于记录长期班的账单及课程时间
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account`
     ADD `endDate` DATE
     NULL
     COMMENT '课程结束时间，用于支持长期班'
     AFTER `addCheckinCount`
     */
  }))
};

/**
 * 销毁表单
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account`
     DROP COLUMN `endDate`;
     */
  }));
};
