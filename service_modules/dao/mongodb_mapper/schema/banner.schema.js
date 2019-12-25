"use strict";

/**
 * 定义 material schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

const enumModel = require('../../../services/model/enum');

let bannerBizTypeEnum = _.keys(enumModel.bannerBizTypeEnum);
let bannerLinkTypeEnum = _.keys(enumModel.bannerLinkTypeEnum)

// create a banner schema
let bannerSchema = new Schema({
    title: { type: String, required: true },
    bizType: { type: String, required:true, enum: bannerBizTypeEnum},
    linkType: { type: String, required:true, enum: bannerLinkTypeEnum},
    image: {type: String, required: true},
    linkUrl: {type: String, required: false, default: ''},
    sort: {type: Number}
});

// create a schema named as Banner, and collection as Banner
let BannerSchema = mongoose.model('WeBanner', bannerSchema, 'WeBanner');

module.exports = BannerSchema;
