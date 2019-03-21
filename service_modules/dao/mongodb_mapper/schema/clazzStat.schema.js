"use strict";

/**
 * 定义 ClazzStat schema
 */

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const ClazzStatSchema = new Schema({
  clazzName: { type: String, required: true },
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  studentCount: { type: Number, required: true },
  cancelCount: { type: Number, required: true },
  checkinCount: { type: Number, required: true },
  checkinRate: { type: Number, required: true },
  targetTime: {type: Date, required: true}
});

// create a schema named as ClazzStat, and collection as ClazzStat
const ClazzStat = mongoose.model('ClazzStat', ClazzStatSchema, 'ClazzStat');

module.exports = ClazzStat;
