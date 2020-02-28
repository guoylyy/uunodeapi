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
let biyiTaskSchema = new Schema({
  title: { type: String, required: true },
  type: { type: String, required:true, enum: taskTypeEnum},
  language: { type: String, required:true, enum: taskLanguageEnum},
  oppoLanguage: { type: String, required:true, enum: taskLanguageEnum},
  level: { type: String, required:true, enum: taskLevelEnum},
  theme: { type: String, required:true, enum: taskThemeEnum},
  status: { type: String, required:true, enum: taskStatusEnum},
  description: {type: String, required: true},
  pic: {type: String, required: true},
  bigPic: {type: String, required: true},
  sourceDate: { type: Date, required: true},
  recommendSeconds: {type: Number, required: true}, // 建议用时
  author: {type: String},
  originText: {type: String, required: true},  // 原文
  translationText: {type: String, required: true},   // 译文
  wordCount: Number // 单词数
});

// create a schema named as Lesson, and collection as Lesson
let BiyiTaskSchema = mongoose.model('WeBiyiTask', biyiTaskSchema, 'WeBiyiTask');

module.exports = BiyiTaskSchema;
