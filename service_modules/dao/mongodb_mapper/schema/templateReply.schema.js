"use strict";

/**
 * 定义 templateReply schema
 */
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let templateReplySchema = new Schema({
  name: { type: String, required: true },
  templateId: {type: String, required: true},
  keys: {type: String},
  content: {
    remark: {type: String},
    first: {type: String}
  },
  urlConfig: {
    keys: {type: Array},
    passInProgram: {type: Boolean},
    baseUrl: {type: String}
  }

});

// create a schema named as TemplateReply, and collection as TemplateReply
let TemplateReply = mongoose.model('TemplateReply', templateReplySchema, 'TemplateReply');

module.exports = TemplateReply;
