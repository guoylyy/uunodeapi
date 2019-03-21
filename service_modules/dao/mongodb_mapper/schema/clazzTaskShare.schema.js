"use strict";

/**
 * 定义 clazzTaskReplyReply schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let clazzTaskShareSchema = new Schema({
  shareDate: { type: Date, required: true, default: Date.now },                      // 回复时间
  userId: { type: Number, required: true },                                       // 本人
  clazzTask: { type: Schema.Types.ObjectId, ref: 'ClazzTask', required: true },       // 任务id
  clazzId: { type: Schema.Types.ObjectId, ref: 'Clazz', required: true },       // 班级id
});

let clazzTaskShare = mongoose.model('ClazzTaskShare', clazzTaskShareSchema, 'ClazzTaskShare');

module.exports = clazzTaskShare;
