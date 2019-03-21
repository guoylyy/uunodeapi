"use strict";

/**
 * 定义 userFile schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let userFileTypeEnum = _.keys(enumModel.fileTypeEnum);

// create a schema
let userFileSchema = new Schema({
  fileKey: { type: String, require: true },
  fileType: { type: String, enum: userFileTypeEnum, required: true },
  fileName: { type: String, trim: true },
  openId: String,
  upTime: { type: Date, required: true },
  format: String,
  fileUrl: String, // 可访问url
  attach: { type: Schema.Types.ObjectId, ref: 'Attach' },
  hasCheckined: { type: Boolean, require: true },
  userId: { type: Number, required: true }
});

// create a schema named as UserFile, and collection as UserFile
let UserFile = mongoose.model('UserFile', userFileSchema, 'UserFile');

module.exports = UserFile;
