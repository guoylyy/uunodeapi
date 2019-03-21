"use strict";

/**
 * 定义 MeatySharing schema
 */

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const meatySharingSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  readCount: { type: Number, default: 0, min: 0 },
  shareAt: { type: Date, required: true }
});

// create a schema named as MeatySharing, and collection as MeatySharing
const MeatySharingSchema = mongoose.model('MeatySharing', meatySharingSchema, 'MeatySharing');

module.exports = MeatySharingSchema;
