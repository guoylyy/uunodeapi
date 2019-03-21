'use strict';

const _ = require('lodash');
const debug = require('debug')('service');
const enumModel = require('../../service_modules/services/model/enum');
// const ubandCardMapper = require('../dao/mysql_mapper/ubandCard.mapper');

const ubandBannerMapper = require('../dao/mysql_mapper/ubandBanner.mapper');

const pub = {};

/**
 * 获取所有的已知banner
 */
pub.queryUbandBanner= () => {
  return ubandBannerMapper.fetchAllByParam({'isActive':true});
};


module.exports = pub;
