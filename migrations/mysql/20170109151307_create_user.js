'use strict';

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  let createUserTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
     `name` char(32) DEFAULT NULL COMMENT '姓名',
     `address` varchar(128) DEFAULT NULL COMMENT '地址',
     `alipay` varchar(32) DEFAULT NULL COMMENT '支付宝昵称',
     `wechat` varchar(32) DEFAULT NULL COMMENT '微信号昵称',
     `phoneNumber` char(16) DEFAULT NULL COMMENT '手机号码',
     `city` varchar(32) DEFAULT NULL COMMENT '城市',
     `sex` int(2) unsigned DEFAULT NULL COMMENT '性别：0未知，1男，2女',
     `headImgUrl` varchar(256) DEFAULT NULL COMMENT '头像地址',
     `studentNumber` varchar(16) DEFAULT NULL COMMENT '学号',
     `invitatedBy` int(11) unsigned DEFAULT NULL COMMENT '邀请人id',
     `saltHashedPassword` varchar(128) DEFAULT NULL COMMENT '加盐hash密码',
     `openId` char(32) DEFAULT NULL COMMENT '微信openid',
     `unionid` char(32) DEFAULT NULL COMMENT '微信unionid',
     `hasFillInfo` tinyint(2) DEFAULT NULL COMMENT '是否填写privacy info',
     `objectId` varchar(32) DEFAULT NULL COMMENT '数据迁移前object id',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));


  let createUserLoginLogTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_login_log` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `userId` int(11) unsigned DEFAULT NULL COMMENT '用户id',
     `xAuthToken` char(255) DEFAULT NULL COMMENT 'token',
     `tokenExpireDate` date DEFAULT NULL COMMENT '过期日期',
     `agent` varchar(64) DEFAULT NULL COMMENT '访问agent',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return Promise.all([
    createUserTablePromise,
    createUserLoginLogTablePromise
  ]);
};

exports.down = function (knex, Promise) {
  let dropUserTablePromise = knex.schema.raw('DROP TABLE user;');

  let dropUserLoginLogTablePromise = knex.schema.raw('DROP TABLE user_login_log;');

  return Promise.all([
    dropUserTablePromise,
    dropUserLoginLogTablePromise
  ]);
};
