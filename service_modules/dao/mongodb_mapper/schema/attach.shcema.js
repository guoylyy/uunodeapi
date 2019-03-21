"use strict";

/**
 * 定义 clazz schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let qiniuFileTypeEnum = _.keys(enumModel.qiniuFileTypeEnum);

// create a schema
let attachSchema = new Schema({
  name: { type: String, required: true },
  key: { type: String, required: true },
  attachType: { type: String, required: true, enum: qiniuFileTypeEnum },
  mimeType: String,
  fileType: String,
  userId: Number,
  size: Number
});

// create a schema named as Attach, and collection as Attach
let Attach = mongoose.model('Attach', attachSchema, 'Attach');

module.exports = Attach;
