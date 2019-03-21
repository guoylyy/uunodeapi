'use strict';

const multiline = require('multiline');
/**
 * 创建user_bind 及 user_easemob_relation 两张表
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function (knex, Promise) {
  const createUsrBindPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_bind` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `userId` int(11) unsigned DEFAULT NULL COMMENT 'user id，关联到user',
     `type` char(32) DEFAULT NULL COMMENT '用户类型，枚举',
     `uuid` char(64) DEFAULT NULL COMMENT '第三方帐号的唯一键',
     `accountName` char(64) DEFAULT NULL COMMENT '第三方账户名',
     `password` varchar(128) DEFAULT NULL COMMENT '第三方登录密码，已hash',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `user_bind_unique_account_name` (`accountName`),
     KEY `user_bind_index_userid_type` (`userId`,`type`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
  }));

  const createEasemobBindRelationPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_easemob_relation` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `clazzId` char(32) DEFAULT NULL COMMENT '班级Id， 在mongodb中',
     `userBindId` int(11) unsigned DEFAULT NULL COMMENT '用户id',
     `partnerBindId` int(11) unsigned DEFAULT NULL COMMENT '同伴id',
     `status` char(32) DEFAULT NULL COMMENT '关系状态，枚举',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     KEY `user_easemob_relation_index_clazzId` (`clazzId`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
  }));

  return Promise.all([createUsrBindPromise, createEasemobBindRelationPromise]);
};

/**
 * 删除 user_bind 及 user_easemob_relation 两张表
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.down = function (knex, Promise) {
  const dropUserBindPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE user_bind;
     */
  }));

  const dropEasmobBindRelationPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE user_easemob_relation;
     */
  }));

  return Promise.all([dropUserBindPromise, dropEasmobBindRelationPromise]);
};
