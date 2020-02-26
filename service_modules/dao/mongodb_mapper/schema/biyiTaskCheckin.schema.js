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

// create a schema
let biyiTaskCheckinSchema = new Schema({
  taskId : { type: Schema.Types.ObjectId, ref: 'WeBiyiTask' },
  task: {
    title: { type: String, required: true },
    type: { type: String, required:true, enum: taskTypeEnum},
    language: { type: String, required:true, enum: taskLanguageEnum},
    oppoLanguage: { type: String, required:true, enum: taskLanguageEnum},
    theme: { type: String, required:true, enum: taskThemeEnum},
    originText: {type: String, required: true},  // 原文
    pic: {type: String, required: true},
    bigPic: {type: String, required: true},
  },
  userId: { type: Number, required: true },
  likeArr: [Number],
  yearMonth: { type: String, required: true },
  practiceTime: { type: Number, required: true }, // 练习时间
  translationText: { type: String, required: true }, // 翻译文本
  wordCount: { type: Number, required: true }, // 单词数
  viewLog: [{
    userId: {type: Number, required : true },
    createdAt: {type: Date, required: true, default: Date.now}
  }]
});

// create a schema named as Lesson, and collection as Lesson
let BiyiTaskCheckinSchema = mongoose.model('WeBiyiTaskCheckin', biyiTaskCheckinSchema, 'WeBiyiTaskCheckin');

module.exports = BiyiTaskCheckinSchema;
