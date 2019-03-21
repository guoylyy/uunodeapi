'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  let createCouponTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `coupon` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
     `money` int(11) unsigned NOT NULL COMMENT '金钱',
     `expireDate` datetime DEFAULT NULL COMMENT '到期时间',
     `remark` text COMMENT '评论',
     `status` char(32) DEFAULT '' COMMENT '统计状态',
     `objectId` varchar(32) DEFAULT NULL COMMENT 'objectId, legacy',
     `userId` int(11) unsigned DEFAULT NULL COMMENT 'userId，参见user',
     `userObjectId` varchar(32) DEFAULT NULL COMMENT '用户 objectId',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return Promise.all([
    createCouponTablePromise
  ]);
};

exports.down = function(knex, Promise) {
  let dropCouponTablePromise = knex.schema.raw('DROP TABLE coupon;');

  return Promise.all([
    dropCouponTablePromise
  ]);
};
