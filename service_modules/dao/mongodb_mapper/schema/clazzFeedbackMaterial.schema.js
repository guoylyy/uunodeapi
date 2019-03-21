"use strict";

/**
 * 定义 clazzFeedbackMaterial schema
 */
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let clazzFeedbackMaterialSchema = new Schema({
  content: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true, maxlength: 32 },
  title: { type: String, required: true, trim: true, maxlength: 64 },
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' }
});

// create a schema named as ClazzFeedbackMaterial, and collection as ClazzFeedbackMaterial
let ClazzFeedbackMaterial = mongoose.model('ClazzFeedbackMaterial', clazzFeedbackMaterialSchema, 'ClazzFeedbackMaterial');

module.exports = ClazzFeedbackMaterial;
