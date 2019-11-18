"use strict";

/**
 * 定义 word schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let wordSaveByUserSchema = new Schema({
  word: {type:String, required:true},
  symbol_en: {type:String},
  symbol_am: {type:String},
  symbol_en_pro: {type:String},
  symbol_am_pro: {type:String},
  userId: {type:BigInt},
  createdAt: {type:Date},
  updatedAt: {type:Date}
});

// create a schema named as Word, and collection as Word
let Word = mongoose.model('WordSaveByUser', wordSchema, 'WordSaveByUser');

module.exports = Word;
