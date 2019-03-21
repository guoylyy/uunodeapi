'use strict';

const multiline = require('multiline');
/**
 * 1. 为 clazz_account 增加 usedFeedbackCount 及 purchasedFeedbackCount 字段，默认 0
 * 2. 创建 clazz_feedback_record 记录笃师一对一反馈记录
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function (knex, Promise) {
  const alertClazzAccountPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account`
     ADD `usedFeedbackCount` INT
     UNSIGNED
     NULL
     DEFAULT '0'
     COMMENT '学员已使用笃师一对一记录'
     AFTER `feedbackRound`,
     ADD `purchasedFeedbackCount` INT
     UNSIGNED
     NULL
     DEFAULT '0'
     COMMENT '学员购买笃师一对一记录'
     AFTER `feedbackRound`
     */
  }));

  const createClazzFeedbackRecordPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     CREATE TABLE `clazz_feedback_record` (
     `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
     `userId` int(11) unsigned DEFAULT NULL COMMENT '用户Id，参见user',
     `clazzId` char(32) DEFAULT NULL COMMENT '班级Id， 在mongodb中',
     `teacherUserId` int(11) unsigned DEFAULT NULL COMMENT '笃师userId， 参见user',
     `status` char(32) DEFAULT NULL COMMENT '笃师一对一反馈状态，枚举',
     `bill` text COMMENT 'bill详情，用户付款情况',
     `appointmentStartDate` datetime DEFAULT NULL COMMENT '预约开始时间',
     `appointmentEndDate` datetime DEFAULT NULL COMMENT '预约结束时间',
     `realStartDate` datetime DEFAULT NULL COMMENT '实际开始时间',
     `realEndDate` datetime DEFAULT NULL COMMENT '实际结束时间',
     `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
     `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
     PRIMARY KEY (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
  }));

  return Promise.all([alertClazzAccountPromise, createClazzFeedbackRecordPromise]);
};

/**
 * 1. 去除 usedFeedbackCount 及 purchasedFeedbackCount 字段
 * 2. 删除 clazz_feedback_record 表单
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.down = function (knex, Promise) {
  const dropClazzAccountColumnPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `clazz_account`
     DROP COLUMN `usedFeedbackCount`,
     DROP COLUMN `purchasedFeedbackCount`
     */
  }));

  const dropClazzFeedbackRecordPromise = knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE clazz_feedback_record;
     */
  }));

  return Promise.all([dropClazzAccountColumnPromise, dropClazzFeedbackRecordPromise]);
};
