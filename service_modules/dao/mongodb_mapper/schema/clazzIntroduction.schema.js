"use strict";

/**
 * 定义 ClazzIntroduction schema
 */
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

let clazzIntroductionSchema = new Schema({
  title: {type: String, required: true},
  subTitle :{type: String, required: true},
  requiredInfo: [{ //运营必要说明
    type:{ type: String },
    content:{ type: String },
  }],
  introduction: String,
  strategy: String,
  payway: String,
});

// create a schema named as ClazzIntroduction, and collection as ClazzIntroduction
let ClazzIntroduction = mongoose.model('ClazzIntroduction', clazzIntroductionSchema, 'ClazzIntroduction');

module.exports = ClazzIntroduction;
