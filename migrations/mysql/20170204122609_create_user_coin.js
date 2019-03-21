'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  let createUserCoinTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_coin` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
     `coinChange` int(11) NOT NULL COMMENT '金钱变化',
     `remark` varchar(255) DEFAULT '' COMMENT '评论',
     `title` varchar(64) DEFAULT '' COMMENT '标题',
     `bizType` char(32) DEFAULT '' COMMENT 'biz状态',
     `bizId` int(11) unsigned DEFAULT NULL COMMENT 'bizId，参见biz',
     `objectId` varchar(32) DEFAULT NULL COMMENT 'objectId, legacy',
     `userId` int(11) unsigned DEFAULT NULL COMMENT 'userId，参见user',
     `userObjectId` varchar(32) DEFAULT NULL COMMENT '用户 objectId',
     `changeDate` datetime DEFAULT NULL COMMENT '修改日期',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB CHARSET=utf8mb4;
     */
  }));

  return Promise.all([
    createUserCoinTablePromise
  ]);
};

exports.down = function(knex, Promise) {
  let dropUsercoinPromise = knex.schema.raw('DROP TABLE user_coin;');

  return Promise.all([
    dropUsercoinPromise
  ]);
};
