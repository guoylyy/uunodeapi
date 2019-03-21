'use strict';

const knex = require('knex');
const bookshelf = require('bookshelf');

let config = require('../../config/db.config');

let bookshelfConnection = bookshelf(knex(config.mysql));

/**
 * 注册plugin
 */

// 避免循环引用问题
bookshelfConnection.plugin('registry');
// 增加fetchPage方法
bookshelfConnection.plugin('pagination');

module.exports = bookshelfConnection;
