'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `post`
     ADD `canTry` TINYINT(1)
     NULL
     DEFAULT false
     COMMENT '是否可以试玩'
     */
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `post`
     DROP COLUMN `canTry`
     */
  }))
};
