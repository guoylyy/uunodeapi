'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user_like`
     ADD `appType` varchar(64)
     NULL
     DEFAULT ''
     COMMENT '应用类型'
     */
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user_like`
     DROP COLUMN `appType`
     */
  }));
};
