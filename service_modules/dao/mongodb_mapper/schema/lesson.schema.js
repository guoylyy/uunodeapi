"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let lessonTypeEnum = _.keys(enumModel.lessonTypeEnum);
let lessonLinkTypeEnum = _.keys(enumModel.lessonLinkTypeEnum);
let lessonStatusEnum = _.keys(enumModel.lessonStatusEnum);
let weappTypeEnum = _.keys(enumModel.weappTypeEnum);

// create a schema
let lessonSchema = new Schema({
  title: { type: String, required: true },
  types: [{ type: String, required:true, enum: lessonTypeEnum}],
  linkType: { type: String, required:true, enum: lessonLinkTypeEnum},
  image: {type: String, required: true},
  linkContent: {type: String, required: false, default: ''},
  linkUrl: {type: String, required: false, default: ''},
  tags: [String],
  description: {type: String, required: true},
  author: {type: String, required: false},
  status: { type: String, required:true, enum: lessonStatusEnum},
  views: {type: Number, default: 0},
  weappType: { type: String, required:true, enum: weappTypeEnum, default: weappTypeEnum.KOUYI},
});

// create a schema named as Lesson, and collection as Lesson
let LessonSchema = mongoose.model('WeLesson', lessonSchema, 'WeLesson');

module.exports = LessonSchema;
