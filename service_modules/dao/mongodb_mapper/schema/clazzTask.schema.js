"use strict";

/**
 * 定义 clazzTask schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let introductionTypeEnum = _.keys(enumModel.clazzTaskIntroductionTypeEnum);

// create a schema
let clazzTaskSchema = new Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  introductions: [{
    content: { type: String, trim: true },
    type: { type: String, required: true, enum: introductionTypeEnum },
    author: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      headimgurl: { type: String, required: true }
    }
  }],
  shareType: {type: String},
  coverPic: {type: String},
  teacher: {
    name : {type: String},
    headImgUrl: {type: String},
    id: {type: String},
  },
  materials: [{ type: Schema.Types.ObjectId, ref: 'MaterialLibrary' }],
  clazz: { type: Schema.Types.ObjectId, ref: 'Clazz' },
  introductionMaterialList: [{
    materialId: { type: Schema.Types.ObjectId, ref: 'MaterialLibrary' },
    title: {type: String},
    url: {type: String},
    type: {type: String}
  }]
});

// create a schema named as ClazzTask, and collection as ClazzTask
let ClazzTask = mongoose.model('ClazzTask', clazzTaskSchema, 'ClazzTask');

module.exports = ClazzTask;
