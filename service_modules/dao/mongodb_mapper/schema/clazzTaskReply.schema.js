"use strict";

/**
 * 定义 clazzTaskReplyReply schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let introductionTypeEnum = _.keys(enumModel.clazzTaskReplyIntroductionTypeEnum);

// create a schema
let clazzTaskReplySchema = new Schema({
  content: { type: String, required: true, trim: true, maxlength: 512 },              // 回复主体内容
  replayDate: { type: Date, required: true, default: Date.now },                      // 回复时间
  fromUserId: { type: Number, required: true },                                       // 本人
  clazzTask: { type: Schema.Types.ObjectId, ref: 'ClazzTask', required: true },       // 任务id
  clazzTaskReply: { type: Schema.Types.ObjectId, ref: 'ClazzTaskReply', default: null },  // 回复对象
  toUserId: {type: Number, default: null}                                                 // 回复谁的消息
});

// create a schema named as ClazzTaskReply, and collection as ClazzTaskReply
let clazzTaskReply = mongoose.model('ClazzTaskReply', clazzTaskReplySchema, 'ClazzTaskReply');

module.exports = clazzTaskReply;
