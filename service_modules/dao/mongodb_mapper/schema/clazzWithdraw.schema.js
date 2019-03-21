"use strict";

/**
 * 定义 clazz withdraw schema
 */
const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const clazzWithdrawSchema = new Schema({
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  checkinRate: { type: Number, required: true },
  checkinNumber: { type: Number, required: true },
  totalWithdrawCount: { type: Number, required: true },
  totalWithdrawMoney: { type: Number, required: true },
  withdrawRecords: [{
    type: Number, required: true
  }],
  userCoinRecords: [{
    type: Number, required: true
  }]
});

// create a schema named as ClazzWithdraw, and collection as ClazzWithdraw
const ClazzWithdraw = mongoose.model('ClazzWithdraw', clazzWithdrawSchema, 'ClazzWithdraw');

module.exports = ClazzWithdraw;
