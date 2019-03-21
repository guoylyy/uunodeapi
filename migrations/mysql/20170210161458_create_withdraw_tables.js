'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  let createUserWithdrawTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_withdraw` (
     `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
     `remark` VARCHAR(256) NULL COMMENT '用户备注',
     `verifiedRemark` VARCHAR(256) NULL COMMENT '审核备注',
     `withdrawInfo` TEXT NULL COMMENT 'JSON格式，取款信息',
     `payway` CHAR(32) NULL COMMENT '付款方式',
     `applyMoney` INT NULL COMMENT '用户申请金额',
     `verifiedMoney` INT NULL COMMENT '审核后金额',
     `keyWord` VARCHAR(256) NULL COMMENT '真实姓名',
     `status` CHAR(32) NULL COMMENT '取款状态',
     `score` INT NULL COMMENT '学分',
     `verifiedDate` DATETIME NULL COMMENT '审核时间',
     `applyDate` DATETIME NULL COMMENT '申请时间',
     `userId` INT(11) UNSIGNED NULL COMMENT 'userId，参见user',
     `objectId` VARCHAR(32) NULL COMMENT '留存，待用',
     `createdAt` TIMESTAMP NULL COMMENT '创建时间',
     `updatedAt` TIMESTAMP NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB CHARSET=utf8mb4;
     */
  }));

  let createUserWithdrawLogTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_withdraw_log` (
     `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
     `logType` CHAR(32) NULL COMMENT '日志类型',
     `logContent` TEXT NULL COMMENT 'JSON格式，日志内容',
     `objectId` VARCHAR(32) NULL COMMENT '留存，待用',
     `createdAt` TIMESTAMP NULL COMMENT '创建时间',
     `updatedAt` TIMESTAMP NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB CHARSET=utf8mb4;
     */
  }));

  return Promise.all([
    createUserWithdrawTablePromise,
    createUserWithdrawLogTablePromise
  ]);
};

exports.down = function(knex, Promise) {
  let dropUserWithdrawPromise = knex.schema.raw('DROP TABLE user_withdraw;');

  let dropUserWithdrawLogPromise = knex.schema.raw('DROP TABLE user_withdraw_log;');

  return Promise.all([
    dropUserWithdrawPromise,
    dropUserWithdrawLogPromise
  ]);
};
