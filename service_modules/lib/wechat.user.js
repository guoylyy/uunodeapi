'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const request = require("request");
const Promise = require('bluebird');
const winston = require('winston');

const systemConfig = require('../../config/config');

const wechatAuth = require('./wechat.auth');
const wechatSign = require('./wechat.sign');

const enumModel = require('../services/model/enum');
const commonError = require('../services/model/common.error');

const userService = require('../services/user.service');
const userBindService = require('../services/userBind.service');

const compiledUserInfoUrlTemplate = _.template('https://api.weixin.qq.com/cgi-bin/user/info?access_token=${ token }&openid=${ openId }&lang=zh_CN');
/**
 * 获取用户基本信息（包括UnionID机制）
 * @param token   调用接口凭证
 * @param openid  普通用户的标识，对当前公众号唯一
 * @returns {*}
 */
const getUserInfoUrl = (token, openid) => {
  return compiledUserInfoUrlTemplate({
    token: token,
    openId: openid
  })
};

/**
 * 批量获取用户基本信息
 *
 * @param openIds
 * @returns {Promise.<TResult>|Promise}
 */
const requestUserInfoList = (openIds) => {
  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {

        const requestBatchUserInfoPromiseList = _.map(openIds, (openId) => {
          return new Promise((resolve) => {
            request(
                getUserInfoUrl(accessToken, openId),
                (error, response, body) => {
                  debug(body);

                  if (!error && response.statusCode === 200) {
                    const userObj = JSON.parse(body);

                    if (userObj.errcode) {
                      winston.error(userObj);
                      winston.error(`获取微信用户 ${ openId } 信息失败, error: ${ userObj.errmsg }`);

                      return resolve(null);
                    }

                    debug(userObj);

                    return resolve(userObj);
                  }

                  winston.error(`获取微信用户 ${ openId } 信息失败, error: ${ error }`);
                  return resolve(null);
                });
          })
        });

        return Promise.all(requestBatchUserInfoPromiseList)
      })
      // 过滤掉为null的元素
      .then((userInfoList) => _.filter(userInfoList, (userInfo) => !_.isNil(userInfo)));
};

const pub = {};

/**
 * 获取用户基本信息（包括UnionID机制）
 *
 * @param openId
 * @returns {Promise.<TResult>|Promise}
 */
pub.requestUserInfo = (openId) => {
  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        return new Promise((resolve, reject) => {
          request(getUserInfoUrl(accessToken, openId), (error, response, body) => {
            debug(body);

            if (!error && response.statusCode === 200) {
              const userObj = JSON.parse(body);

              if (userObj.errcode) {
                return reject(new Error(userObj.errmsg))
              }

              debug(userObj);

              return resolve(userObj);
            }

            return reject(error);
          });
        })
      });
};

/**
 * 根据openId获取用户信息，如果该用户不存在，则注册之
 *
 * @param openId
 * @returns {Promise.<TResult>}
 */
pub.requestUserInfoThenSignUpIfAbsent = (openId) => {
  // 获取登录用户信息
  return userService.fetchByOpenId(openId)
      .then((userItem) => {
        debug(userItem);
        // 用户不存在的处理逻辑
        if (_.isNil(userItem)) {
          // 获取用户信息
          return pub.requestUserInfo(openId)
              .then((wechatUser) => {
                debug(wechatUser);

                // 用户未注册
                if (wechatUser.subscribe === 0) {
                  winston.error('用户未关注公众号，无法获取完整信息以完成注册过程。 wechatUser : %j', wechatUser);
                  return Promise.reject(commonError.REGISTER_REQUIRED());
                }

                // 测试环境
                if (global.IS_DEVLOPMENT_ENVIRONMENT === true) {
                  // 注册新用户
                  return userService.wechatSignUp(wechatUser);
                }

                // 正式环境
                const unionId = wechatUser.unionid;

                // 监测unionId是否存在，不存在则注册新用户
                return userService.fetchByUnionid(unionId)
                    .then((userItem) => {
                      if (_.isNil(userItem)) {
                        return userService.wechatSignUp(wechatUser);
                      }

                      // 如果用户的openId与解析的openId不一致，则更新之
                      if (openId !== userItem.openId) {
                        userService.updateUserItem(
                            userItem.id,
                            {
                              openId: openId
                            }
                        );
                      }

                      return userItem;
                    })
              });
        }

        return userItem;
      })
};

/**
 * 请求小程序用户信息
 *
 * 使用用户wx.login及wx.getUserInfo后的相关信息进行微信用户消息解码 及 获取用户信息流程
 * 参考： [微信小程序开发文档 code 换取 session_key](https://mp.weixin.qq.com/debug/wxadoc/dev/api/api-login.html#wxloginobject)
 *
 * @param code            小程序调用 wx.login 方法后返回的 用户允许登录后，返回的登录凭证（code）
 * @param encryptedData   小程序调用 wx.getUserInfo 方法后返回的 包括敏感数据在内的完整用户信息的加密数据
 * @param iv              小程序调用 wx.getUserInfo 方法后返回的 加密算法的初始向量
 * @returns {Promise.<TResult>}
 */
pub.requestWeappUserInfo = (code, encryptedData, iv) => {
  const PARSE_ERROR = { code: 801, message: '解析用户信息失败' },
      APPID = systemConfig.WEAPP_ONE_CONFIG.APP_ID;

  return new Promise(
      (resolve, reject) => {
        request(
            {
              uri: 'https://api.weixin.qq.com/sns/jscode2session',
              qs: {
                appid: APPID,                           // 小程序唯一标识
                secret: systemConfig.WEAPP_ONE_CONFIG.SECRET, // 小程序的 app secret
                js_code: code,                          // 登录时获取的 code
                grant_type: 'authorization_code'        // 填写为 authorization_code
              }
            },
            (error, responses, body) => {
              debug(error);
              debug(body);

              winston.error('body',body);

              if (error) {
                return reject(error);
              }

              if (responses.statusCode === 200) {
                try {
                  const responseBody = JSON.parse(body);
                  const sessionKey = responseBody.session_key;  // 会话密钥

                  const wxBizDataCrypt = wechatSign.wxBizDataCrypt(APPID, sessionKey);
                  const decryptedData = wxBizDataCrypt.decryptData(encryptedData, iv);

                  return resolve(decryptedData);
                } catch (exception) {
                  winston.error(exception);
                  return reject(PARSE_ERROR);
                }
              } else {
                return reject(PARSE_ERROR);
              }
            });
      });
};

/**
 * 请求小程序用户信息 并注册为系统用户
 *
 * @param code            小程序调用 wx.login 方法后返回的 用户允许登录后，返回的登录凭证（code）
 * @param encryptedData   小程序调用 wx.getUserInfo 方法后返回的 包括敏感数据在内的完整用户信息的加密数据
 * @param iv              小程序调用 wx.getUserInfo 方法后返回的 加密算法的初始向量
 * @returns {Promise.<TResult>}
 */
pub.requestWeappUserInfoThenSignupIfAbsent = (code, encryptedData, iv) => {
  return pub.requestWeappUserInfo(code, encryptedData, iv)
      .then((userInfo) => {
        debug(userInfo);

        winston.error('user', userInfo);

        return userService.fetchByUnionid(userInfo.unionId)
            .then((userItem) => {
              // 未注册用户，则执行注册流程
              const registerUserBindItem = (registeredUserItem) => {
                return userBindService.createBindUser(
                    registeredUserItem.id,
                    enumModel.userBindTypeEnum.WEAPP_ONE.key,
                    userInfo.openId
                    )
                    .catch((error) => {
                      winston.error(error);
                      return {};
                    });
              };

              if (_.isNil(userItem)) {
                return userService.wechatSignUp({
                      nickname: userInfo.nickName,
                      headimgurl: userInfo.avatarUrl,
                      unionId: userInfo.unionId,
                      openId: userInfo.openId,
                      sex: userInfo.gender,
                      city: userInfo.city
                    })
                    .then((registeredUserItem) => {
                      debug(registeredUserItem);
                      // 注册第三方用户信息
                      return registerUserBindItem(registeredUserItem)
                          .then((userBindItem) => {
                            debug(userBindItem);
                            //此处需要标记是新注册的用户
                            registeredUserItem['isNewUser'] = true;
                            return registeredUserItem;
                          });
                    });
              }

              // 检查是否存在第三方账户，不存在则注册之
              userBindService.fetchUserBind(enumModel.userBindTypeEnum.WEAPP_ONE.key, userInfo.openId)
                  .then((userBindItem) => {
                    debug(userBindItem);
                    if (_.isNil(userBindItem)) {
                      //此处也需要标记是新注册的用户
                      return registerUserBindItem(userItem).then((userBindItem)=>{
                        debug(userBindItem);
                        userItem['isNewUser'] = true;
                        return userItem;
                      });
                    }
                    return null;
                  });

              // 已注册用户，更新头像后，直接返回
              return userItem;
            });
      });
};

/**
 * 同步用户列表
 *
 * @param userList
 * @returns {*}
 */
pub.syncUserInfoList = (userList) => {
  debug(userList);

  if (_.isEmpty(userList)) {
    return Promise.resolve([]);
  }

  const userOpenIdMap = {},
      openIdList = [];

  // 去除openId为空的用户
  _.forEach(userList, (userItem) => {
    const userOpenId = userItem.openId;

    if (!_.isNil(userOpenId)) {
      openIdList.push(userOpenId);
      userOpenIdMap[userOpenId] = userItem.id;
    }
  });

  return requestUserInfoList(openIdList)
      .then((userInfoList) => {
        debug(userInfoList);

        const updateUserPromiseList = _.map(userInfoList, (userInfo) => {
          const userItem = {
            unionid: userInfo.unionid
          };

          const { nickname, headimgurl } = userInfo;

          // 只要name不为空才更新
          if (!_.isEmpty(nickname)) {
            userItem.name = nickname
          }

          // 只有当头像不为空的时候才更新
          if (!_.isEmpty(headimgurl)) {
            userItem.headImgUrl = headimgurl
          }

          debug(userItem);

          const userId = userOpenIdMap[userInfo.openid];
          return userService.updateUserItem(userId, userItem)
              .catch((error) => {
                winston.error(`更新用户 ${ userId } 信息列表失败, error: ${ error }`);

                return {}
              });
        });

        return Promise.all(updateUserPromiseList);
      })
      .catch((error) => {
        winston.error(`更新微信用户信息列表失败, error: ${ error }`);

        return [];
      });
};

module.exports = pub;
