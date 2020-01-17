"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let taskTypeEnum = _.keys(enumModel.taskTypeEnum);
let taskLanguageEnum = _.keys(enumModel.taskLanguageEnum)
let taskThemeEnum = _.keys(enumModel.taskThemeEnum)
let taskLevelEnum = _.keys(enumModel.taskLevelEnum)
let taskStatusEnum = _.keys(enumModel.taskStatusEnum)

// create a schema
let taskSchema = new Schema({
  title: { type: String, required: true },
  type: { type: String, required:true, enum: taskTypeEnum},
  language: { type: String, required:true, enum: taskLanguageEnum},
  oppoLanguage: { type: String, required:true, enum: taskLanguageEnum},
  level: { type: String, required:true, enum: taskLevelEnum},
  theme: { type: String, required:true, enum: taskThemeEnum},
  status: { type: String, required:true, enum: taskStatusEnum},
  description: {type: String, required: true},
  attachText: {type: String, required: true},
  pic: {type: String, required: true},
  bigPic: {type: String, required: true},
  pausePoints: [Number],
  oppoPausePoints: [Number],
  terminology: [{
    word: {type: String, required: true},
    notes: {type: String, required: true}
  }],
  srcVideo: { type: Schema.Types.ObjectId, ref: 'Attach' },
  srcAudio: { type: Schema.Types.ObjectId, ref: 'Attach' },
  oppoVideo: { type: Schema.Types.ObjectId, ref: 'Attach' },
  oppoAudio: { type: Schema.Types.ObjectId, ref: 'Attach' },
  push: {type: Boolean, default: false},
  sourceDate: { type: Date, required: true},
  duration: {type: Number, required: true},
  author: {type: String},
});

// create a schema named as Lesson, and collection as Lesson
let TaskSchema = mongoose.model('WeTask', taskSchema, 'WeTask');

module.exports = TaskSchema;
