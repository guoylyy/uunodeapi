'use strict';

/**
 * 微信多媒体文件基本方法
 *
 * https://mp.weixin.qq.com/wiki/12/58bfcfabbd501c7cd77c19bd9cfa8354.html
 */
const _ = require('lodash');
const debug = require('debug')('lib');

const wechatAuth = require('./wechat.auth');

const WECHAT_MULTIMEDIA_FILE_BASE_URL = 'http://file.api.weixin.qq.com/cgi-bin/media/get';


const fetchWechatMediaTemplate = _.template(WECHAT_MULTIMEDIA_FILE_BASE_URL + '?access_token=${ token }&media_id=${ mediaId }');


const pub = {};

/**
 * 获取微信多媒体文件下载地址
 * 注意：视频文件不支持下载
 * @returns {*}
 */
pub.fetchWechatFileUrlFunction = () => {
  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        debug(accessToken);

        return (fileKey) => {
          debug(fileKey);

          return fetchWechatMediaTemplate({
            token: accessToken,
            mediaId: fileKey
          })
        }
      });
};

module.exports = pub;
