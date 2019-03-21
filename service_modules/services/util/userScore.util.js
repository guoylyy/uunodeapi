'use strict';

const _ = require('lodash');
const debug = require('debug')('util');

const enumModel = require('../model/enum');

const pub = {};

pub.userScoreCalculatorFactory = (type) => {
  debug(type);

  switch (type) {
    case enumModel.userScoreTypeEnum.CHECKIN_REVIEW.key:
      return (userScoreList) => _.chain(userScoreList).map('scoreChange').mean().floor().value();
    default:
      return (userScoreList) => _.chain(userScoreList).map('scoreChange').sum().value();
  }
};

module.exports = pub;
