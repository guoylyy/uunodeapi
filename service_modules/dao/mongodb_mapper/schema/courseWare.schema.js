"use strict";

/**
 * Created at Mar 4, 2020 20:48 by HuPeng
 * Defined CourseWare Schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

// create a courseWare schema
let courseWareSchema = new Schema({
  clazzTeacherId: { type: Schema.Types.ObjectId, required: true, ref: 'ClazzTeacher' },
  attach: { type: Schema.Types.ObjectId, required: true, ref: 'Attach' }, // 附件
  title: { type: String, required: true }, // 标题
  seq: { type: Number, required: true },  // 序号
  text: { type: String, required: true }, // 讲义
  type: { type: String, required:true, enum: _.keys(enumModel.courseWareTypeEnum)}, // 材料类型 视频 音频
  isPublish: {type: Boolean, default: false}, // 是否上架
  isDemo: {type: Boolean, default: false}, // 试听
  isShow: {type: Boolean, default: true} // 目录是否展示
});

// create a schema named as CourseWare, and collection as CourseWare
let CourseWareSchema = mongoose.model('CourseWare', courseWareSchema, 'CourseWare');

module.exports = CourseWareSchema;
