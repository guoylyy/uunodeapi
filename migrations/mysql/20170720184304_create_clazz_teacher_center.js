'use strict';

const multiline = require('multiline');
/**
 * 1. 新建笃师——学员关系表
 * 2. 新建笃师-课程关系表
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function (knex, Promise) {
  const createClazzTeacherUserFollowPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `clazz_teacher_follow_users` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `clazzTeacherId` char(32) DEFAULT NULL COMMENT '笃师id，参见Mong中的ClazzTeacher',
     `userId` int(11) unsigned DEFAULT NULL COMMENT '用户id，参见user',
     `followAt` datetime DEFAULT NULL COMMENT '关注时间',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `clazz_teacher_follow__user_unique` (`clazzTeacherId`,`userId`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  const createClazzTeacherClazzesPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `clazz_teacher_clazzes` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `clazzId` char(32) DEFAULT NULL COMMENT '班级id，参见Mongo中的Clazz',
     `clazzTeacherId` char(32) DEFAULT NULL COMMENT '笃师id，参见Mongo中的ClazzTeacher',
     `studentCount` int(11) unsigned DEFAULT NULL COMMENT '班级学员数目',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`),
     UNIQUE KEY `clazz_teacher_clazz_unique` (`clazzTeacherId`,`clazzId`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
     */
  }));

  return Promise.all([createClazzTeacherUserFollowPromise, createClazzTeacherClazzesPromise])
};

exports.down = function (knex, Promise) {
  const dropClazzTeacherUserFollowPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE clazz_teacher_follow_users;
     */
  }));

  const dropClazzTeacherClazzesPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE clazz_teacher_clazzes;
     */
  }));

  return Promise.all([dropClazzTeacherUserFollowPromise, dropClazzTeacherClazzesPromise]);
};
