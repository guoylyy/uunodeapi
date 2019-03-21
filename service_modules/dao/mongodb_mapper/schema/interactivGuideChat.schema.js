"use strict";

/**
 * 定义 InteractiveGuideChat schema
 */

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const interactiveGuideChatSchema = new Schema({
  order: { type: Number, required: true },
  type: { type: String, required: true },
  userId: Number,
  url: { type: String }, // 可访问url
  content: { type: String }
});

// create a schema named as InteractiveGuideChat, and collection as InteractiveGuideChat
const InteractiveGuideChat = mongoose.model('InteractiveGuideChat', interactiveGuideChatSchema, 'InteractiveGuideChat');

module.exports = InteractiveGuideChat;
