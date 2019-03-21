'use strict';

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  const alterAddonInfoToPromoterPromise = knex.schema.raw(multiline.stripIndent(
      () => {
        /*
         DROP TABLE user_addon_info;
         */
      }))
      .then(() => knex.schema.raw(multiline.stripIndent(() => {
        /*
         CREATE TABLE `promotion_user` (
         `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
         `userId` int(11) unsigned DEFAULT NULL COMMENT '用户Id，参见user',
         `qrcode` text COMMENT '微信推广二维码',
         `key` char(32) DEFAULT NULL COMMENT '首单优惠码',
         `joinDate` datetime DEFAULT NULL COMMENT '加入时间',
         `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
         `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
         PRIMARY KEY (`id`),
         UNIQUE KEY `promotion_user_unique_user_id` (`userId`),
         UNIQUE KEY `promotion_user_unique_key` (`key`)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
         */
      })));

  const createPromotionRelationPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `promotion_user_relation` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `promotionId` int(11) unsigned DEFAULT NULL COMMENT '推广用户表Id，参见promition_user',
     `promoterUserId` int(11) unsigned DEFAULT NULL COMMENT '推广用户Id，参见user',
     `inviteeUserId` int(11) unsigned DEFAULT NULL COMMENT '被邀用户id，参见user',
     `type` char(32) DEFAULT NULL COMMENT '推广类型，枚举',
     `invitedTime` datetime DEFAULT NULL COMMENT '邀请时间，即被邀请用户加入时间',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `promotion_user_relation_unique_promoter_invitee` (`promoterUserId`,`inviteeUserId`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));


  const createPromotionUserIncomePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `promotion_user_income` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `promoterUserId` int(11) unsigned DEFAULT NULL COMMENT '推广用户Id，参见user',
     `inviteeUserId` int(11) unsigned DEFAULT NULL COMMENT '被邀用户id，参见user',
     `clazzId` char(32) DEFAULT NULL COMMENT '班级Id， 在mongodb中',
     `userPayId` int(11) unsigned DEFAULT NULL COMMENT '用户支付记录id，参见user_pay',
     `status` char(32) DEFAULT NULL COMMENT '收益状态，枚举类型',
     `inviteeUserBenefit` int(11) unsigned DEFAULT NULL COMMENT '被邀用户的减免费用，单位：分',
     `promoterUserIncome` int(11) unsigned DEFAULT NULL COMMENT '推广用户的收益，单位：分',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return Promise.all([alterAddonInfoToPromoterPromise, createPromotionRelationPromise, createPromotionUserIncomePromise]);
};

exports.down = function (knex, Promise) {
  const recreateAddonInfoPromise = knex.schema.raw(multiline.stripIndent(
      () => {
        /*
         DROP TABLE promotion_user;
         */
      }))
      .then(() => knex.schema.raw(multiline.stripIndent(() => {
        /*
         CREATE TABLE `user_addon_info` (
         `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
         `userId` int(11) unsigned DEFAULT NULL COMMENT '用户Id，参见user',
         `qrcode` text COMMENT '微信推广二维码',
         `qrcodeAttachId` char(32) DEFAULT NULL COMMENT '微信推广二维码attachId',
         `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
         `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
         PRIMARY KEY (`id`),
         UNIQUE KEY `user_addon_info_unique_user_id` (`userId`)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
         */
      })));

  const dropPromotionRelationPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE promotion_user_relation;
     */
  }));

  const dropPromotionUserIncomePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE promotion_user_income;
     */
  }));

  return Promise.all([recreateAddonInfoPromise, dropPromotionRelationPromise, dropPromotionUserIncomePromise]);
};
