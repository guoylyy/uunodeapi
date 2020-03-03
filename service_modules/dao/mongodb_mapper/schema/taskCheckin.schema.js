"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');
const practiceModeEnum = enumModel.miniKYPracticeModeEnum;


let taskTypeEnum = _.keys(enumModel.taskTypeEnum);
let taskLanguageEnum = _.keys(enumModel.taskLanguageEnum)
let taskThemeEnum = _.keys(enumModel.taskThemeEnum)

// create a schema
let taskCheckinSchema = new Schema({
  title: { type: String, required: true },
  attach: { type: Schema.Types.ObjectId, ref: 'Attach' },
  taskId : { type: Schema.Types.ObjectId, ref: 'WeTask' },
  task: {
    title: { type: String, required: true },
    type: { type: String, required:true, enum: taskTypeEnum},
    language: { type: String, required:true, enum: taskLanguageEnum},
    oppoLanguage: { type: String, required:true, enum: taskLanguageEnum},
    theme: { type: String, required:true, enum: taskThemeEnum},
    pic: {type: String, required: true},
    bigPic: {type: String, required: true},
    duration: Number
  },
  userId: { type: Number, required: true },
  likeArr: [Number],
  practiceMode: { type: String, required:true, enum: _.keys(practiceModeEnum)},
  yearMonth: { type: String, required: true },
  practiceTime: Number,
  audioDuration: Number,
  viewLog: [{
    userId: {type: Number, required : true },
    createdAt: {type: Date, required: true, default: Date.now}
  }],
  isPublic: {type: Boolean, required: true, default: false}
});

// create a schema named as Lesson, and collection as Lesson
let TaskCheckinSchema = mongoose.model('WeTaskCheckin', taskCheckinSchema, 'WeTaskCheckin');

module.exports = TaskCheckinSchema;
