'use strict';

const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `system_config`
     MODIFY `value` VARCHAR(2048)
     */
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
   /*
     ALTER TABLE `system_config`
     MODIFY `value` VARCHAR(256)
     */
  }))
};
