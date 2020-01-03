"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');
const practiceModeEnum = enumModel.miniKYPracticeModeEnum;

// create a schema
let taskCheckinSchema = new Schema({
  title: { type: String, required: true },
  attach: { type: Schema.Types.ObjectId, ref: 'Attach' },
  task: { type: Schema.Types.ObjectId, ref: 'WeTask' },
  userId: { type: Number, required: true },
  type: {type: Number, default: 0},
  likeArr: [Number],
  practiceMode: { type: String, required:true, enum: _.keys(practiceModeEnum)},
});

// create a schema named as Lesson, and collection as Lesson
let TaskCheckinSchema = mongoose.model('WeTaskCheckin', taskCheckinSchema, 'WeTaskCheckin');

module.exports = TaskCheckinSchema;