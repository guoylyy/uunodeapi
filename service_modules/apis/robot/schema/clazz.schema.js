'use strict';

const Joi = require('joi').extend(require('joi-date-extensions'));
const _ = require('lodash');

const enumModel = require('../../../services/model/enum');

let pub = {};

/**
 * 查询课程列表query schema
 * @type {*}
 */
pub.clazzQuerySchema = Joi.object();

module.exports = pub;
