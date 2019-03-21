'use strict';

/**
 * 微信资源lib
 */

const _ = require('lodash');
const wechatAuth = require('./wechat.auth');

let pub = {};

let compliedMediaUrlTemplate = _.template('http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=${ token }&media_id=${ mediaId }');
/**
 * 获取微信素材链接
 * @param mediaId
 * @returns {Promise.<TResult>|Promise}
 */
pub.fetchMediaUrl = (mediaId) => {
  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        return compliedMediaUrlTemplate({ token: accessToken, mediaId: mediaId });
      });
};

module.exports = pub;
