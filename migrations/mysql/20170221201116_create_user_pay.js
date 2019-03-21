'use strict';

/**
 * 新建user_pay表，用户支付记录
 */

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_pay` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `prepayId` char(64) DEFAULT NULL COMMENT '预支付交易会话标识',
     `payTime` datetime DEFAULT NULL COMMENT '下单时间',
     `payInfo` text COMMENT '支付详情信息',
     `transactionId` char(32) DEFAULT NULL COMMENT '微信订单号',
     `outBizId` varchar(32) DEFAULT NULL COMMENT '账单外链 -- 通常为clazz_account的id',
     `outBizType` char(32) DEFAULT NULL COMMENT '账单类型 -- 通常为CLAZZPAY',
     `status` char(32) DEFAULT NULL COMMENT '支付状态',
     `bookingNo` varchar(32) DEFAULT NULL COMMENT '商户订单号',
     `userId` int(11) unsigned DEFAULT NULL COMMENT 'user Id',
     `objectId` varchar(32) DEFAULT NULL COMMENT 'legacy',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('DROP TABLE user_pay;');
};
