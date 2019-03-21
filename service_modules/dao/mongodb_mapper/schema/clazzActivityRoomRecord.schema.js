"use strict";

/**
 * 定义 userFile schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

const wechatMessageTypeEnum = _.keys(enumModel.wechatMessageTypeEnum);

// create a schema
const clazzActivityRoomRecordSchema = new Schema({
  clazzActivityRoom: { type: Schema.Types.ObjectId, ref: 'ClazzActivityRoom' },
  userId: { type: Number, required: true },
  messageType: { type: String, enum: wechatMessageTypeEnum, required: true },
  mediaId: { type: String, require: true },
  textContent: { type: String }, // 文字消息的内容
  attach: { type: Schema.Types.ObjectId, ref: 'Attach' },
  fileUrl: String, // 可访问url, 一般为attach对应的公开链接
});

// create a schema named as UserFile, and collection as UserFile
const ClazzActivityRoomRecord = mongoose.model('ClazzActivityRoomRecord', clazzActivityRoomRecordSchema, 'ClazzActivityRoomRecord');

module.exports = ClazzActivityRoomRecord;
