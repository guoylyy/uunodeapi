"use strict";

/**
 * 定义 ClazzActivityAccount schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

const genderEnum = _.keys(enumModel.genderEnum);
const gameAccountStatusEnum = _.keys(enumModel.activityAccountStatusEnum);

// create a schema
const clazzActivityAccountSchema = new Schema({
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  userId: { type: Number, required: true },
  status: { type: String, required: true, enum: gameAccountStatusEnum },
  clazzActivityRoom: { type: Schema.Types.ObjectId, ref: 'ClazzActivityRoom' },
  gender: { type: String, required: true, enum: genderEnum },
  introduction: { type: String },
  partnerRequired: {
    gender: { type: String, enum: genderEnum }
  },
  version: { type: Number },
  favourList: [{type: Number}],
});

// create a schema named as ClazzActivityAccount, and collection as ClazzActivityAccount
const ClazzActivityAccount = mongoose.model('ClazzActivityAccount', clazzActivityAccountSchema, 'ClazzActivityAccount');

module.exports = ClazzActivityAccount;
