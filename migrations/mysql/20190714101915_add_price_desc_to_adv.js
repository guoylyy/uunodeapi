'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `adv_entity`
     ADD `price` INT
     UNSIGNED
     NULL
     DEFAULT '0'
     COMMENT '课程价格'
     AFTER `type`,
     ADD `description` varchar(256)
     NULL
     DEFAULT ''
     COMMENT '描述'
     AFTER `type`
     */
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `adv_entity`
     DROP COLUMN `price`,
     DROP COLUMN `description`
     */
  }));
};
