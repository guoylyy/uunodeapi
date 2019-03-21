"use strict";

/**
 * 定义 reply schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let replyTypeEnum = _.keys(enumModel.customizedMsgTypeEnum);

// create a schema
let replySchema = new Schema({
  replyType: { type: String, enum: replyTypeEnum, required: true },
  optType: {type: String, match: /MSG/, required: true},
  content: {
    Content: {type: String, required: true}
  },
  name: { type: String, required: true }
});


// 自定义检查
replySchema.path('content.Content').validate((content) => !_.isNil(content), '`{PATH} 不能为空');

// create a schema named as Reply, and collection as Reply
let Reply = mongoose.model('Reply', replySchema, 'Reply');

module.exports = Reply;
