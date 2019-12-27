"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

// create a schema
let taskCheckinSchema = new Schema({
  title: { type: String, required: true },
  attach: { type: Schema.Types.ObjectId, ref: 'Attach' },
  task: { type: Schema.Types.ObjectId, ref: 'WeTask' },
  userId: { type: Number, required: true }
});

// create a schema named as Lesson, and collection as Lesson
let TaskCheckinSchema = mongoose.model('WeTaskCheckin', taskCheckinSchema, 'WeTaskCheckin');

module.exports = TaskCheckinSchema;
