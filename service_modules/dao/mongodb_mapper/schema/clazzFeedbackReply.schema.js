"use strict";

/**
 * 定义 clazzFeedbackReply schema
 */
const _ = require('lodash');
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

const clazzFeedbackReplyTypeEnum = _.keys(enumModel.clazzFeedbackReplyTypeEnum);

// create a schema
const clazzFeedbackReplySchema = new Schema({
  userId: { type: Number },
  adminId: { type: Number },
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  clazzFeedback: { type: Schema.Types.ObjectId, required: true, ref: 'ClazzFeedback' },
  replyType: { type: String, required: true, enum: clazzFeedbackReplyTypeEnum },
  content: { type: String, trim: true, maxlength: 1024 },
  attach: { type: Schema.Types.ObjectId, ref: 'Attach' },
  feedbackMaterial: { type: Schema.Types.ObjectId, ref: 'ClazzFeedbackMaterial' },
  userScoreId: { type: Number },
  checkinId: { type: Schema.Types.ObjectId, ref: 'Checkin' }
});

// create a schema named as ClazzFeedbackReply, and collection as ClazzFeedbackReply
const ClazzFeedbackReply = mongoose.model('ClazzFeedbackReply', clazzFeedbackReplySchema, 'ClazzFeedbackReply');

module.exports = ClazzFeedbackReply;
