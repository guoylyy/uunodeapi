"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let lessonTypeEnum = _.keys(enumModel.lessonTypeEnum);
let lessonLinkTypeEnum = _.keys(enumModel.lessonLinkTypeEnum)

// create a schema
let lessonSchema = new Schema({
  title: { type: String, required: true },
  type: { type: String, required:true, enum: lessonTypeEnum},
  linkType: { type: String, required:true, enum: lessonLinkTypeEnum},
  image: {type: String, required: true},
  linkContent: {type: String, required: false, default: ''},
  linkUrl: {type: String, required: false, default: ''},
  isHot: {type: Boolean, required: false, default: false},
  isTop: {type: Boolean, required: false, default: false}
});

// create a schema named as Lesson, and collection as Lesson
let LessonSchema = mongoose.model('WeLesson', lessonSchema, 'WeLesson');

module.exports = LessonSchema;
