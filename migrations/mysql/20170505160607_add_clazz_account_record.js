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
     CREATE TABLE `clazz_account_record` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
     `bill` text COMMENT 'bill详情，用户付款情况',
     `clazzAccountId` int(11) unsigned DEFAULT NULL COMMENT 'clazzAccountId，参见clazz_account',
     `userId` int(11) unsigned DEFAULT NULL COMMENT '额外字段，记录用户信息，userId，参见user',
     `clazzId` char(32) DEFAULT NULL COMMENT '额外字段，记录班级信息，班级Id， 在mongodb中',
     `startDate` date DEFAULT NULL COMMENT '课程记录开始日期',
     `endDate` date DEFAULT NULL COMMENT '课程记录结束日期',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
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
  return knex.schema.raw('DROP TABLE clazz_account_record;');
};
