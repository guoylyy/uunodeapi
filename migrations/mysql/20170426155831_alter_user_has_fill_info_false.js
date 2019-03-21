'use strict';

const multiline = require('multiline');
/**
 * 设置用户均未填写过私人信息
 *
 * @param knex
 * @param Promise
 * @returns {*|string}
 */
exports.up = function(knex, Promise) {
  return knex.schema.raw("update user set hasFillInfo = 0")
};

exports.down = function(knex, Promise) {
  return Promise.resolve(null);
};
