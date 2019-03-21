"use strict";

/**
 * 定义 ClazzTeacherCommend schema
 */

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const clazzTeacherCommendSchema = new Schema({
  userId: { type: Number, min: 0, required: true },
  clazzTeacher: { type: Schema.Types.ObjectId, ref: 'ClazzTeacher' },
  clazzName: { type: String, required: true },
  clazz: { type: Schema.Types.ObjectId, ref: 'Clazz' },
  commend: { type: String, require: true },
});

// create a schema named as ClazzTeacherCommend, and collection as ClazzTeacherCommend
const ClazzTeacherCommendSchema = mongoose.model('ClazzTeacherCommend', clazzTeacherCommendSchema, 'ClazzTeacherCommend');

module.exports = ClazzTeacherCommendSchema;
