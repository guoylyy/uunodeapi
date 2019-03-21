'use strict';

const multiline = require('multiline');

exports.up = function (knex, Promise) {
  const createUserScoreRecordPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
      CREATE TABLE `user_score_record` (
        `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
        `userId` int(11) unsigned DEFAULT NULL COMMENT '用户Id',
        `clazzId` char(32) DEFAULT NULL COMMENT '班级Id',
        `adminId` int(11) unsigned DEFAULT NULL COMMENT '管理员Id',
        `scoreChange` int(11) unsigned DEFAULT NULL COMMENT '评分更改，100对应实际的1分',
        `type` char(32) DEFAULT NULL COMMENT '评分类型',
        `targetId` char(32) DEFAULT NULL COMMENT '目标Id',
        `remark` varchar(256) DEFAULT NULL COMMENT '备注信息，如 打卡评价',
        `changeAt` datetime DEFAULT NULL COMMENT '更改日期',
        `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
        `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
        PRIMARY KEY (`id`),
        KEY `index_user_score_userid` (`userId`),
        KEY `index_user_score_userid_clazzid` (`clazzId`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  const addClazzAccountScorePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
      ALTER TABLE `clazz_account` ADD `clazzScore` INT(11)
      UNSIGNED
      NULL
      DEFAULT 0
      COMMENT '评分总和 100对应实际的1分'
      AFTER `endDate`
     */
  }));

  return Promise.all([createUserScoreRecordPromise, addClazzAccountScorePromise])
};

exports.down = function (knex, Promise) {
  const dropUserScoreRecordPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE user_score_record;
     */
  }));

  const dropClazzAccountScorePromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account`
     DROP COLUMN `clazzScore`;
     */
  }));

  return Promise.all([dropUserScoreRecordPromise, dropClazzAccountScorePromise])
};
