"use strict";

/**
 * 定义 clazzTask schema
 */
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const clazzRolePlaySchema = new Schema({
  title: { type: String, required: true },
  clazz: { type: Schema.Types.ObjectId, ref: 'Clazz' },
  targetDate: { type: Date, required: true },
  fileSize: { type: Number, required: true },
  sections: [{
    sectionType: { type: String, trim: true },
    dialogs: [{
      dialogType: { type: String, required: true },
      dialogColorType: { type: String, required: true },
      role: {
        roleType: { type: String, required: true },
        headImgUrl: { type: String },
        name: { type: String },
      },
      placement: { type: String, required: true },
      content: { type: String },
      file: {
        materialId: { type: Schema.Types.ObjectId, ref: 'MaterialLibrary' },
        materialType: { type: String },
        title: { type: String },
        url: { type: String },
      }
    }]
  }]
});

// create a schema named as ClazzRolePlay, and collection as ClazzRolePlay
const clazzRolePlay = mongoose.model('ClazzRolePlay', clazzRolePlaySchema, 'ClazzRolePlay');

module.exports = clazzRolePlay;
