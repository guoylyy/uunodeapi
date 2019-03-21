'use strict';

/**
 * 定义 userPassport schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

const userEnglishLevelEnum = _.keys(enumModel.userEnglishLevelEnum),
    userSelfIdentityEnum = _.keys(enumModel.userSelfIdentityEnum),
    learningModeEnum = _.keys(enumModel.learningModeEnum);

// create a schema
const userPassportSchema = new Schema({
  userId: {type: Number, required: true},
  userEnglishLevel: { type: String, enum: userEnglishLevelEnum, required: true },
  userSelfIdentity: { type: String, enum: userSelfIdentityEnum, required: true },
  preferLearningMode: { type: String, enumModel: learningModeEnum, required: true }
});

// create a schema named as UserPassport, and collection as UserPassport
let UserPassport = mongoose.model('UserPassport', userPassportSchema, 'UserPassport');

module.exports = UserPassport;
