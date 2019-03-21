'use strict';

const multiline = require('multiline');

/**
 * 新建用户退班记录表单
 *
 * @param knex
 * @param Promise
 */
exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
      CREATE TABLE `clazz_exit` (
      `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
      `clazzId` char(32) DEFAULT NULL COMMENT '班级id',
      `userId` int(11) unsigned DEFAULT NULL COMMENT '用户id',
      `clazzAccountId` int(11) unsigned DEFAULT NULL COMMENT '班级学员id',
      `status` char(16) DEFAULT NULL COMMENT '退班申请状态',
      `applyDate` datetime DEFAULT NULL COMMENT '用户申请日期',
      `userCoins` int(11) DEFAULT NULL COMMENT '应退优币数量',
      `realUserCoins` int(11) DEFAULT NULL COMMENT '实际退款优币 ',
      `userCoinId` int(11) unsigned DEFAULT NULL COMMENT '管理的优币记录id ',
      `userReason` varchar(255) DEFAULT NULL COMMENT '用户退班理由',
      `remark` varchar(255) DEFAULT NULL COMMENT '审核备注',
      `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
      `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
      PRIMARY KEY (`id`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    */
  }));
};

/**
 * 移除表单
 *
 * @param knex
 * @param Promise
 */
exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE clazz_exit;
     */
  }));
};
