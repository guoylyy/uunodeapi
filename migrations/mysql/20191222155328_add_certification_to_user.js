'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     ADD `certification` varchar(512)
     NULL
     DEFAULT ''
     COMMENT '这个数'
     AFTER `school`
     */
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user`
     DROP COLUMN `certification`
     */
  }));
};
