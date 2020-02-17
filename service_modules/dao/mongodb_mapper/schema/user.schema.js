"use strict";

/**
 * 定义 userFile schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let user = new Schema({
  school: { type: String, require: true },
  userId: { type: Number, required: true }
});

// create a schema named as WeUser, and collection as WeUser
let UserFile = mongoose.model('WeUser', user, 'WeUser');

module.exports = UserFile;
