'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const request = require("request");
const Promise = require('bluebird');
const winston = require('winston');

const systemConfig = require('../../config/config');

const userService = require('../services/user.service');
const wechatTokenService = require('../services/wechatToken.service');
const userBindService = require('../services/userBind.service');

const userMapper = require('../dao/mysql_mapper/user.mapper');

let compiledAuthUrlTemplate = _.template('https://open.weixin.qq.com/connect/oauth2/authorize?appid=${ appid }&redirect_uri=${ redirectUri }&response_type=code&scope=${ scope }&state=${ state }#wechat_redirect');
/**
 * 获取微信授权的跳转地址
 *
 * @param appid 微信appid
 * @param url   授权成功后的跳转地址
 * @param scope 应用授权作用域，snsapi_base / snsapi_userinfo
 * @param state 重定向后会带上state参数
 * @returns {*}
 */
let getAuthUrl = (appid, url, scope, state) => {
  return compiledAuthUrlTemplate({
    appid: appid,
    redirectUri: encodeURIComponent(url),
    scope: scope,
    state: state
  });
};

let compiledQrConnectUrlTemplate = _.template('https://open.weixin.qq.com/connect/qrconnect?appid=${ appid }&redirect_uri=${ redirectUri }&response_type=code&scope=${ scope }&state=${ state }#wechat_redirect');
/**
 * 获取微信二维码跳转地址
 *
 * @param appid
 * @param url
 * @param scope
 * @param state
 * @returns {*}
 */
let getQrConnectUrl = (appid, url, scope, state) => {
  return compiledQrConnectUrlTemplate({
    appid: appid,
    redirectUri: encodeURIComponent(url),
    scope: scope,
    state: state
  });
};

let compiledAuthTokenUrlTemplate = _.template('https://api.weixin.qq.com/sns/oauth2/access_token?appid=${ appid }&secret=${ secret }&code=${ code }&grant_type=authorization_code');
/**
 * 获取网页授权access_token的url地址
 * @param appid 微信appid
 * @param secret  微信app相应secret
 * @param code  用户授权后微信提供的code参数
 * @returns {*}
 */
let getAuthTokenUrl = (appid, secret, code) => {
  return compiledAuthTokenUrlTemplate({
    appid: appid,
    secret: secret,
    code: code
  });
};

let compiledUserInfoUrlTemplate = _.template('https://api.weixin.qq.com/sns/userinfo?access_token=${ token }&openid=${ openId }&lang=zh_CN');
/**
 * 获取拉取用户信息的url地址
 * @param token   网页授权接口调用凭证
 * @param openid  用户的唯一标识
 * @returns {*}
 */
let getUserInfoUrl = (token, openid) => {
  return compiledUserInfoUrlTemplate({
    token: token,
    openId: openid
  })
};

let compiledAccessTokenUrlTemplate = _.template('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${ appid }&secret=${ secret }');
/**
 * 获取微信access_token接口的url地址
 *
 * 公众号调用各接口时都需使用access_token
 * @returns {*}
 */
let getAccessTokenUrl = () => {
  return compiledAccessTokenUrlTemplate({
    appid: systemConfig.WECHAT_APP_CONFIG.APP_ID,
    secret: systemConfig.WECHAT_APP_CONFIG.SECRET
  })
};

let compiledJsApiTicketUrlTemplate = _.template('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${ token }&type=jsapi');
/**
 * 获得jsapi_ticket接口的url地址
 *
 * @param token
 * @returns {*}
 */
let getJsApiTicketUrl = (token) => {
  return compiledJsApiTicketUrlTemplate({ token: token })
};

let pub = {};


/**
 * 获取用户个人信息
 *
 * @param token
 * @param openid
 *
 * {
    "subscribe": 1,
    "openid": "o6_bmjrPTlm6_2sgVt7hMZOPfL2M",
    "nickname": "Band",
    "sex": 1,
    "language": "zh_CN",
    "city": "广州",
    "province": "广东",
    "country": "中国",
    "headimgurl":    "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/0",
    "subscribe_time": 1382694957,
    "unionid": " o6_bmasdasdsad6_2sgVt7hMZOPfL"
    "remark": "",
    "groupid": 0
   }
 */
pub.requestWechatUserinfo = (token, openid) => {
  return new Promise((resolve, reject) => {
    request(getUserInfoUrl(token, openid), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        let userObj = JSON.parse(body);

        debug(userObj);

        return resolve(userObj);
      }

      // 延迟任务中，需明确reject
      return reject(error);
    });
  });
};

/**
 * 获取微信token
 *
 * @param appid 微信appid
 * @param secret  微信app相应secret
 * @param code  网页授权，用户同意授权，获取code
 */
pub.requestWechatAuthAccessToken = (appid, secret, code) => {
  return new Promise((resolve, reject) => {
    request(getAuthTokenUrl(appid, secret, code), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const obj = JSON.parse(body);

        debug(obj);

        if (_.isNil(obj.access_token) || _.isNil(obj.openid)) {
          winston.error('error: no unionid, openid, or token: %j', obj);
          return reject(new Error('微信授权失败'));
        }

        return resolve([obj.access_token, obj.openid, obj.unionid]);
      }

      return reject(error);
    });
  });
};

/**
 * 获取微信授权地址
 *
 * @param appid   微信appid
 * @param url     授权成功后跳转的url地址
 */
pub.getWechatAuthUrl = (appid, url) => {
  let state = 'ME'; // 'ENROLL', 'COURSE', 'ONE';

  // for (let index = 0, length = systemConfig.REDIRECT_CONFIG.length; index < length; ++index) {
  //   let redirect = systemConfig.REDIRECT_CONFIG[index];
  //
  //   if (_.startsWith(url, redirect.url)) {
  //     state = redirect.key;
  //     break;
  //   }
  // }

  return getAuthUrl(appid, url, 'snsapi_userinfo', state);
};

pub.getWechatQrConnectUrl = (appid, url) => {
  let state = 'WEB';

  return getQrConnectUrl(appid, url, 'snsapi_login', state);
};

let globalAccessToken = null;
/**
 * 获取access token -> 接口调用凭据
 *
 * @returns {Promise.<T>}
 */
pub.requestLocalWechatAccessToken = () => {
  return wechatTokenService.fetchLatestAccessToken()
      .then((tokenItem) => {
        debug(tokenItem);

        if (_.isNil(tokenItem)) {
          return Promise.reject(new Error('access token not exists'));
        }

        return tokenItem.token;
      });
};

pub.requestRemoteWechatAccessToken = () => {
  return new Promise((resolve, reject) => {
    request(getAccessTokenUrl(), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        let obj = JSON.parse(body);

        // {"access_token":"ACCESS_TOKEN","expires_in":7200}
        debug(obj);

        if (obj.access_token) {

          return resolve(obj.access_token);
        }

        return reject(new Error('error: no access token'));
      }

      return reject(error);
    });
  })
};

/**
 * 获取jsapi_ticket -> 公众号用于调用微信JS接口的临时票据。
 * @returns {*}
 */
pub.requestLocalWechatJsApiTicket = () => {
  return wechatTokenService.fetchLatestTicket()
      .then((ticketItem) => {
        debug(ticketItem);

        if (_.isNil(ticketItem)) {
          return Promise.reject(new Error('js api ticket not exists'));
        }

        return ticketItem.ticket;
      })
};

pub.requestRemoteWechatJsApiTicket = () => {
  return pub.requestLocalWechatAccessToken()
      .then((accessToken) => {
        return new Promise((resolve, reject) => {
          request(getJsApiTicketUrl(accessToken), (error, response, body) => {
            if (!error && response.statusCode === 200) {
              let obj = JSON.parse(body);

              // {"errcode":0, "errmsg":"ok", "ticket":"bxLdikRXVbTPdHSM05e5u5sUoXNKd8-41ZO3MhKoyN5OfkWITDGgnr2fwJ0m9E8NYzWKVZvdVtaUgWvsdshFKA","expires_in":7200}
              debug(obj);

              if (obj.ticket) {
                return resolve(obj.ticket);
              }

              return reject(new Error('error: no js ticket'));
            }

            return reject(error);
          });
        })
      })
};

/**
 * 根据authCode获取用户信息
 *
 * @param appid           微信程序appid
 * @param appSecret       对应secret
 * @param authCode        用户授权token
 * @param userBindType    第三方帐号类型
 * @param targetUserItem  如果为空则注册，否则更新之
 * @returns {Promise.<TResult>}
 */
pub.requestUserItemByAuthCode = (appid, appSecret, authCode, userBindType, targetUserItem) => {

  let accessToken,
      unionId,
      openId;

  return pub.requestWechatAuthAccessToken(appid, appSecret, authCode)
      .then((results) => {
        debug(results);

        accessToken = results[0];
        openId = results[1];
        unionId = results[2];

        // 根据unionId获取用户信息
        return userMapper.fetchByParam({unionid: unionId});
      })
      .then((userItem) => {
        debug(userItem);

        // 如果用户信息不存在，则先从微信获取用户信息，然后注册
        const registerUserBindItem = (registeredUserItem) => {
          return userBindService.createBindUser(
              registeredUserItem.id,
              userBindType,
              openId
              )
              .catch((error) => {
                winston.error(error);

                return {};
              });
        };

        if (_.isNil(userItem)) {

          return pub.requestWechatUserinfo(accessToken, openId)
              .then((userObject) => {
                debug(userObject);

                // 如果目标用户为空，则注册
                if (_.isNil(targetUserItem)) {
                  winston.info("APP WECHAT REGISTER", userObject);
                  return userService.wechatSignUpPlus(userObject)
                      .then((registeredUserItem) => {
                        //  注册第三方用户信息
                        return registerUserBindItem(registeredUserItem)
                            .then((userBindItem) => {
                              debug(userBindItem);
                              return registeredUserItem;
                            });
                      });
                } else {
                  // 否则更新信息，除了openid
                  return userService.updateUserItem(
                      targetUserItem.id,
                      {
                        name: userObject.nickname,
                        headImgUrl: userObject.headimgurl,
                        unionid: userObject.unionid,
                        sex: userObject.sex,
                        city: userObject.city
                      }
                  );
                }
              });
        }

        // 检查是否存在第三方账户，不存在则注册之
        userBindService.fetchUserBind(userBindType, openId)
            .then((userBindItem) => {
              if (_.isNil(userBindItem)) {
                return registerUserBindItem(userItem);
              }

              return null;
            });

        return userItem;
      });
};

module.exports = pub;
