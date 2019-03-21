"use strict";

/**
 * 定义 ClazzTeacher schema
 */

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const clazzTeacherSchema = new Schema({
  name: { type: String, required: true },
  headImgUrl: { type: String, required: true },
  description: { type: String, required: true },
  gender: {type: String, require: true},
  businessScope: { type: String, required: true },
  introduction: { type: String, required: true },
  audioUrl: { type: String },
  sortOrder: {type: Number, required: true},
  isAvailable: {type: Boolean, required: true},
  tags: [
    {type: String}
  ],
  followUserCount: {type: Number, default: 0, min: 0},
  clazzStudentCount: {type: Number, default: 0, min: 0},
  meatySharingList: [
    { type: Schema.Types.ObjectId, ref: 'MeatySharing' }
  ]
});

// create a schema named as ClazzTeacher, and collection as ClazzTeacher
const ClazzTeacher = mongoose.model('ClazzTeacher', clazzTeacherSchema, 'ClazzTeacher');

module.exports = ClazzTeacher;
