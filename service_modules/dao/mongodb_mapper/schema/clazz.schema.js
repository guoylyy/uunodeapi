"use strict";

/**
 * 定义 clazz schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let clazzStatusEnum = _.keys(enumModel.clazzStatusEnum);
let clazzTypeEnum = _.keys(enumModel.clazzTypeEnum);
let clazzJoinTypeEnum = _.keys(enumModel.clazzJoinTypeEnum);

// create a schema
let clazzSchema = new Schema({
  name: { type: String, required: true },
  author: { type: String, required: true },
  status: { type: String, required: true, enum: clazzStatusEnum },
  clazzType: { type: String, required: true, enum: clazzTypeEnum },
  clazzKey: String,
  description: String,
  openDate: Date,
  startDate: Date,
  endDate: Date,
  banner: String,
  smallBanner: String,
  teacherHead: String,
  tags: [String],
  bindTeacherId: { type: Schema.Types.ObjectId, ref: 'ClazzTeacher' },
  introduction: { type: Schema.Types.ObjectId, ref: 'ClazzIntroduction' },
  configuration: {
    promotionOffer: {
      isPromotion: Boolean,
      promotionIncome: Number,
      firstOffer: Number
    },
    QALimit: { type: Number, required: true },
    addCheckinLimit: { type: Number, required: true },
    invitationRequire: { type: Number, required: true },
    groupRequire: { type: Number, required: true },
    hasTheOneFeedback: { type: Boolean, required: true },
    feedbackRound: { type: Number, required: true },
    taskCount: { type: Number, required: true },
    startHour: { type: Number, required: true },
    endHour: { type: Number, required: true },
    totalFee: { type: Number, required: false },
    originFee: { type: Number, required: false },
    eachDayBackFee:{type: Number, required: false},
    strategyLink: {type:String, required: false},
    priceList: [{
      name: { type: String },
      months: { type: Number, required: true },
      totalFee: { type: Number, required: true },
      originFee: { type: Number, required: true }
    }],
    discount: { type: Number, required: false },
    clazzType: [{ type: String, enum: clazzJoinTypeEnum, required: true }],
    teacherOpenIds: [{ type: String, required: false }],
    robot: {
      name: {type: String, required: false},
      wechat:{type: String, required: false},
      cipher:{type: String, required: false}
    }
  },
  isShow: { type: Boolean, default: true },
  isHot: { type: Boolean, default: false },
  classifyType: { type: String, required: false},
});

// create a schema named as Clazz, and collection as Clazz
let Clazz = mongoose.model('Clazz', clazzSchema, 'Clazz');

module.exports = Clazz;
