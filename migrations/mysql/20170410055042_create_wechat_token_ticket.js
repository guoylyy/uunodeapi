'use strict';

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  let createWechatTicketTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `wechat_ticket` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `ticket` varchar(512) DEFAULT NULL,
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));


  let createWechatTokenTablePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `wechat_token` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `token` varchar(512) DEFAULT NULL,
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return Promise.all([
    createWechatTicketTablePromise,
    createWechatTokenTablePromise
  ]);
};

exports.down = function (knex, Promise) {
  let dropWechatTicketTablePromise = knex.schema.raw('DROP TABLE wechat_ticket;');

  let dropWechatTokenTablePromise = knex.schema.raw('DROP TABLE wechat_token;');

  return Promise.all([
    dropWechatTicketTablePromise,
    dropWechatTokenTablePromise
  ]);
};
