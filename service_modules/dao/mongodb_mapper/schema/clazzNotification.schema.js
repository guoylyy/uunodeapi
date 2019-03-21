"use strict";

/**
 * 定义 ClazzNotification schema
 */
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const clazzNotificationSchema = new Schema({
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  clazzJoinStatus: { type: String, required: true },
  title: { type: String, required: true, maxlength: 256},
  remark: { type: String, required: true, maxlength: 512},
  url: { type: String, required: true },
  success: { type: Number, required: true },
  fail: { type: Number, required: true },
  pushAt: { type: Date, required: true }
});

// create a schema named as ClazzNotification, and collection as ClazzNotification
const ClazzNotification = mongoose.model('ClazzNotification', clazzNotificationSchema, 'ClazzNotification');

module.exports = ClazzNotification;
