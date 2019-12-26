"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let pushTaskSchema = new Schema({
  pushAt: { type: String, required: true },
  taskId: { type: Schema.Types.ObjectId, ref: 'WeTask' },
});

// create a schema named as Lesson, and collection as Lesson
let PushTaskSchema = mongoose.model('WePushTask', pushTaskSchema, 'WePushTask');

module.exports = PushTaskSchema;
