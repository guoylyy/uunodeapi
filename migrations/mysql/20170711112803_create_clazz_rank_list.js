'use strict';

const multiline = require('multiline');

/**
 * 新建表单
 * clazz_rank_favour_list  排行榜点赞榜单
 * clazz_rank_list         排行榜
 *
 * @param knex
 * @param Promise
 * @returns {Promise.<*>}
 */
exports.up = function (knex, Promise) {
  const createRankFavourListPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `clazz_rank_favour_list` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `clazzRankId` int(11) unsigned DEFAULT NULL COMMENT '排行榜Id，参见clazz_rank_list',
     `userId` int(11) DEFAULT NULL COMMENT '用户Id，参见user',
     `favourAt` date DEFAULT NULL COMMENT '点赞日期',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `clazz_rank_favour_list_unique_user_favour` (`clazzRankId`,`userId`,`favourAt`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  const createClazzRankListPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `clazz_rank_list` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `userId` int(11) unsigned DEFAULT NULL COMMENT '用户Id，参见user',
     `clazzId` char(32) DEFAULT NULL COMMENT '班级Id， 在mongodb中',
     `rank` int(11) unsigned DEFAULT NULL COMMENT '排名',
     `grade` int(11) DEFAULT NULL COMMENT '分数',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `clazz_rank_list_unique_clazz_user` (`clazzId`,`userId`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return Promise.all([createRankFavourListPromise, createClazzRankListPromise]);
};

/**
 * 回滚操作，删除表单
 *
 * @param knex
 * @param Promise
 * @returns {Promise.<*>}
 */
exports.down = function (knex, Promise) {
  const dropRankFavourListPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE clazz_rank_favour_list;
     */
  }));

  const dropClazzRankListPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE clazz_rank_list;
     */
  }));

  return Promise.all([dropRankFavourListPromise, dropClazzRankListPromise]);
};
