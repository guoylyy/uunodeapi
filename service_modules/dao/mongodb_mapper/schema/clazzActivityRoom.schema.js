"use strict";

/**
 * 定义 ClazzActivityRoom schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

const gamRoomStatusEnum = _.keys(enumModel.activityRoomStatusEnum);

// create a schema
const clazzActivityRoomSchema = new Schema({
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  status: { type: String, required: true, enum: gamRoomStatusEnum },
  version: { type: Number, required: true },
  partnerList: [
    { type: Number, required: true }
  ],
  activityAccountList: [
    { type: Schema.Types.ObjectId, required: true, ref: 'ClazzActivityAccount' }
  ],
  recordList: [
    {
      completedAt: { type: Date, required: true },
    }
  ],
  endDate: Date
});

// create a schema named as ClazzActivityAccount, and collection as ClazzActivityAccount
const ClazzActivityRoom = mongoose.model('ClazzActivityRoom', clazzActivityRoomSchema, 'ClazzActivityRoom');

module.exports = ClazzActivityRoom;
