"use strict";

/**
 * 定义 clazzFeedback schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let clazzFeedbackStatusEnum = _.keys(enumModel.clazzFeedbackStatusEnum);

// create a schema
let clazzFeedbackSchema = new Schema({
  status: { type: String, required: true, enum: clazzFeedbackStatusEnum },
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  userId: { type: Number, required: true },
  feedbackRound: { type: Number, required: true },
  latestAlertAt: { type: Date }
});

// create a schema named as ClazzFeedback, and collection as ClazzFeedback
let ClazzFeedback = mongoose.model('ClazzFeedback', clazzFeedbackSchema, 'ClazzFeedback');

module.exports = ClazzFeedback;
