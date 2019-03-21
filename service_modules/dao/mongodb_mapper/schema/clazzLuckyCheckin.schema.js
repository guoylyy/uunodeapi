"use strict";

/**
 * 定义 ClazzIntroduction schema
 */
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const clazzLuckyCheckinSchema = new Schema({
  clazz: { type: Schema.Types.ObjectId, ref: 'Clazz' },
  date: { type: Date, required: true },
  luckyNumber: { type: Number, required: true },
  checkins: [{ type: Schema.Types.ObjectId, ref: 'Checkin' }]
});

// create a schema named as ClazzLuckyCheckin, and collection as ClazzLuckyCheckin
const clazzLuckyCheckin = mongoose.model('ClazzLuckyCheckin', clazzLuckyCheckinSchema, 'ClazzLuckyCheckin');

module.exports = clazzLuckyCheckin;
