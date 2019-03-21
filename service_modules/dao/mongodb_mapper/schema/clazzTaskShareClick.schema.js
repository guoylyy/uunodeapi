"use strict";

/**
 * 定义 clazzTaskShareClick schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let clazzTaskShareClickSchema = new Schema({
  clickTime: { type: Date, required: true, default: Date.now },                      // 回复时间
  userId: { type: Number, required: true },                                       // 本人
  taskId: { type: Schema.Types.ObjectId, ref: 'ClazzTask', required: true },       // 任务id
  clazzId: { type: Schema.Types.ObjectId, ref: 'Clazz', required: true },       // 班级id
});

let clazzTaskShareClick = mongoose.model('ClazzTaskShareClick', clazzTaskShareClickSchema, 'ClazzTaskShareClick');

module.exports = clazzTaskShareClick;
