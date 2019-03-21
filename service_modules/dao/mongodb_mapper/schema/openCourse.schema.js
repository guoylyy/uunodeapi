"use strict";

/**
 * 定义 clazz schema
 */
const _ = require('lodash');

const mongoose = require('../../mongo.connection');
const Schema = mongoose.Schema;

// create a schema
const openCourseSchema = new Schema({
  name: { type: String, required: true },
  author: { type: String, required: true },
  logo: { type: String, required: true },
  banner: { type: String, required: true },
  status: { type: String, required: true },
  description: String,
  openDate: { type: Date, required: true },
  isSticked: { type: Boolean, required: true },
  tagList: [
    { type: String }
  ],
  teacherUserIdList: [
    { type: Number }
  ],
  courseGroup: {
    groupid: String,
    groupname: String,
    desc: String,
    public: Boolean,
    maxusers: Number,
    owner: String,
    approval: Boolean
  },
  discussGroup: {
    groupid: String,
    groupname: String,
    desc: String,
    public: Boolean,
    maxusers: Number,
    approval: Boolean,
    owner: String
  },
  groupOwner: {
    username: String,
    password: String
  }
});

// create a schema named as Clazz, and collection as Clazz
const OpenCourse = mongoose.model('OpenCourse', openCourseSchema, 'OpenCourse');

module.exports = OpenCourse;
