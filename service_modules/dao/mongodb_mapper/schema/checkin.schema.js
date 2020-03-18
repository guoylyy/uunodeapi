"use strict";

/**
 * 定义 checkin schema
 */
const _ = require('lodash');
const debug = require('debug')('schema');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let checkinStatusEnum = _.keys(enumModel.checkinStatusEnum);

// todo 创建专门的schema validate类
// 自定义schema validate方法
let arrayNotEmpty = (array) => {
  debug(array);
  return _.isArray(array) && !_.isEmpty(array);
};


// create a schema
let checkinSchema = new Schema({
  status: { type: String, required: true, enum: checkinStatusEnum },
  checkinFiles: {
    fileKeys: [{ type: String, required: true, ref: 'UserFile' }]
  },
  clazz: { type: Schema.Types.ObjectId, required: true, ref: 'Clazz' },
  taskId:{ type: Schema.Types.ObjectId, required: false, ref: 'ClazzTask' },
  score: { type: Number, required: true },
  userId: { type: Number, required: true },
  userScoreIds: [
    { type: Number }
  ],
  isPublic: {type: Boolean, required:true, default: false},
  title: {type: String, required: false, default: ""},
  userScore: { type: Number },
  checkinTime: { type: Date, required: true, default: Date.now },
  remark: String,
  likeArr: [Number],
  dislikeArr: [Number],
  isFeatured: { type: Boolean, default: false}, // 精选
  hasReviews: { type: Boolean, default: false}, // 有点评
  reviews: [{
    text: String,
    audioId: { type: Schema.Types.ObjectId, ref: 'UserFile' },
    videoId: { type: Schema.Types.ObjectId, ref: 'UserFile' },
  }]
});

// 自定义检查
checkinSchema.path('checkinFiles.fileKeys').validate(arrayNotEmpty, '`{PATH} 不能为空');

// create a schema named as Checkin, and collection as Checkin
let Clazz = mongoose.model('Checkin', checkinSchema, 'Checkin');

module.exports = Clazz;
