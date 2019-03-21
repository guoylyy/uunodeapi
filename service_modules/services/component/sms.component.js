'use strict';

const _ = require('lodash');
const debug = require('debug')('component');
const Promise = require('bluebird');
const winston = require('winston');
const request = require('request');

const systemConfig = require('../../../config/config');

const API_URL = _.get(systemConfig.SMS_YUNPIAN_CONFIG, ["SMS_SEND_URL"], "https://sms.yunpian.com/v2/sms/single_send.json");
const API_KEY = _.get(systemConfig.SMS_YUNPIAN_CONFIG, ['SMS_API_KEY'], "");
const SMS_TEXT_TEMPLATE = _.template(_.get(systemConfig.SMS_YUNPIAN_CONFIG, ['SMS_MESSAGE_FORMAT'], ""));

const pub = {};

pub.sendCodeToPhonenumber = (code, phoneNumber) => {
  const data = {
    apikey: API_KEY,
    mobile: encodeURIComponent(phoneNumber),
    text: SMS_TEXT_TEMPLATE({code: code})
  };

  return new Promise((resolve, reject) => {
    request.post(
        API_URL,
        {
          form: data
        },
        (error, response, body) => {
          debug(error);

          if (!_.isNil(error)) {
            return reject(error);
          }

          debug(body);

          return resolve(JSON.parse(body));
        }
    );
  });
};

module.exports = pub;
