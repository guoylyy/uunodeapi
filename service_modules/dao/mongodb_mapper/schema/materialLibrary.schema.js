"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let materialTypeEnum = _.keys(enumModel.materialTypeEnum);

// create a schema
let materialSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, required: true, enum: materialTypeEnum },
  attach: { type: Schema.Types.ObjectId, ref: 'Attach', required: true },
  clazz: { type: Schema.Types.ObjectId, ref: 'Clazz', required: true }
});

// create a schema named as MaterialLibrary, and collection as MaterialLibrary
let MaterialLibrary = mongoose.model('MaterialLibrary', materialSchema, 'MaterialLibrary');

module.exports = MaterialLibrary;
