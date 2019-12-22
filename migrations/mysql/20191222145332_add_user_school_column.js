'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     ADD `school` varchar(64)
     NULL
     DEFAULT ''
     COMMENT '学校'
     AFTER `city`
     */
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     DROP COLUMN `school`
     */
  }));
};
