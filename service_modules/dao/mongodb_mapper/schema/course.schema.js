"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

// create a schema
let courseSchema = new Schema({
  title: { type: String, required: true },
  clazzTeacherId: { type: Schema.Types.ObjectId, required: true, ref: 'ClazzTeacher' },
  clazzTeacherName: { type: String, required: true }, // 冗余字段方便查询
  description: { type: String, required: true },
  courseHours: { type: Number, required: true },
  bannerUrl: { type: String, required: true },
  status: { type: String, required:true, enum: _.keys(enumModel.courseStatusEnum)},
  price: { type: Number, required: true }, // 单位：分
});

// create a schema named as Course, and collection as Course
let CourseSchema = mongoose.model('Course', courseSchema, 'Course');

module.exports = CourseSchema;

