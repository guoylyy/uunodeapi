'use strict';

const multiline = require('multiline');
/**
 * 新建公开课-用户关系
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `user_opencourse_relation` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `userId` int(11) unsigned DEFAULT NULL COMMENT '用户id，参见user',
     `openCourseId` char(32) DEFAULT NULL COMMENT '公开课id， 参见OpenCourse',
     `status` char(32) DEFAULT NULL COMMENT '状态，枚举',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE user_opencourse_relation;
     */
  }));
};
