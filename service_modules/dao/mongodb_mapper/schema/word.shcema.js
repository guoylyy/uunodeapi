"use strict";

/**
 * 定义 word schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
let wordSchema = new Schema({
  word: {type:String, required:true},
  symbol_en: {type:String},
  symbol_am: {type:String},
  symbol_en_pro: {type:String},
  symbol_am_pro: {type:String},
  sample: [{
    chinese: {type: String, required: true},
    english: {type: String, required: true},
    sound: {type: String, required: true}
  }],
  explain_zh: [{
      word_type:{type: String, required: true},
      explain:{type: String, required: true}
  }]
});

// create a schema named as Word, and collection as Word
let Word = mongoose.model('Word', wordSchema, 'Word');

module.exports = Word;
