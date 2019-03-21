'use strict';
/**
 * 环信component，提供环信第三方支持服务
 */
const _ = require('lodash');
const debug = require('debug')('component');
const Promise = require('bluebird');
const winston = require('winston');
const moment = require('moment');
const request = require('request');
const uuid = require('uuid');

const systemConfig = require('../../../config/config');

const encryptUtil = require('../util/encrypt.util');
const userBindUtil = require('../util/userBind.util');

const EASEMOB_CONFIG = systemConfig.EASEMOB.WEAPP_ONE;
const BASE_URL = `${ EASEMOB_CONFIG.HOST }/${ EASEMOB_CONFIG.ORG_NAME }/${ EASEMOB_CONFIG.APP_NAME}`

/**
 * token保存器
 *
 * @type {{token: string, expiredAt: Date}}
 */
const EASEMOB_TOKEN = {
  token: '',            // access token
  expiredAt: new Date() // token过期日期
};

/**
 * 获取环信手群token
 *
 * @returns {Promise.<string>}
 */
const fetchToken = () => {
  /**
   * 请求环信 access token
   */
  const requestAccessToken = () => {
    const uri = `${ BASE_URL }/token`;

    const data = {
      grant_type: 'client_credentials',
      client_id: systemConfig.EASEMOB.WEAPP_ONE.CLIENT_ID,
      client_secret: systemConfig.EASEMOB.WEAPP_ONE.CLIENT_SECRET
    };

    return new Promise((resolve, reject) => {
      request.post(
          uri,
          {
            body: JSON.stringify(data),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          },
          (error, response, body) => {
            debug(error);

            if (!_.isNil(error)) {
              return reject(error);
            }

            debug(body);

            return resolve(JSON.parse(body));
          });
    });
  };

  const nowMoment = moment();

  if (nowMoment.isBefore(EASEMOB_TOKEN.expiredAt)) {
    return Promise.resolve(EASEMOB_TOKEN.token);
  }

  return requestAccessToken()
      .then((tokenResult) => {
        debug(tokenResult);

        EASEMOB_TOKEN.token = tokenResult.access_token;
        EASEMOB_TOKEN.expiredAt = nowMoment.add(tokenResult.expires_in, 'seconds').toDate();

        return EASEMOB_TOKEN.token;
      });
};

const hashPasswordPromise = encryptUtil.getHashPasswordPromiseFunction(EASEMOB_CONFIG.SALT_ROUNDS);

/**
 * 将用户信息映射成注册环信账户需要的信息
 *
 * @param clazzItem
 * @param userItem
 */
const parseUserItemToEasemobUser = (clazzItem, userItem) => {
  const isClazzTeacher = _.get(userItem, 'isClazzTeacher', false);

  const username = userBindUtil.getEasemobUsername(isClazzTeacher, userItem, clazzItem);

  return hashPasswordPromise(userItem.openId)
      .then((hashedPassword) => {
        debug(hashedPassword);

        return {
          username: username,
          password: hashedPassword,
          nickname: userItem.name
        };
      });
};

/**
 * 封装四种方法，访问时带上授权token
 *
 * @type {{get, post, put, delete}}
 */
const requestWithToken = (() => {
  const realRequest = (method) => (uri, data) => {
    return fetchToken()
        .then((token) => {
          return new Promise((resolve, reject) => {
            request(
                {
                  uri: uri,
                  method: method,
                  body: JSON.stringify(data),
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    Authorization: 'Bearer ' + token
                  }
                },
                (error, response, body) => {
                  debug(error);

                  if (!_.isNil(error)) {
                    return reject(error);
                  }

                  debug(body);

                  const requestResult = JSON.parse(body);

                  if (!_.isNil(requestResult.error)) {
                    return reject(new Error(requestResult.error));
                  }

                  return resolve(requestResult);
                });
          });
        });
  };

  return {
    get: realRequest('GET'),
    post: realRequest('POST'),
    put: realRequest('PUT'),
    delete: realRequest('DELETE')
  }
})();

/**
 * 获取环信添加单个群成员url
 *
 * @param groupId
 * @param userName
 * @returns {*}
 */
const getAddGroupUserUrl = (groupId, userName) => {
  const addGroupUserUrlTemplate = _.template('${ baseUrl }/chatgroups/${ groupId }/users/${ userName }');

  return addGroupUserUrlTemplate({
    baseUrl: BASE_URL,
    groupId: groupId,
    userName: userName
  });
};

/**
 * 获取环信添加单个用户至群组黑名单url
 *
 * @param groupId
 * @param userName
 * @returns {*}
 */
const getBlockGroupUserUrl = (groupId, userName) => {
  const blockGroupUserUrlTemplate = _.template('${ baseUrl }/chatgroups/${ groupId }/blocks/users/${ userName }');

  return blockGroupUserUrlTemplate({
    baseUrl: BASE_URL,
    groupId: groupId,
    userName: userName
  });
};

const pub = {};

pub.hashPasswordPromise = hashPasswordPromise;

/**
 * 注册用户为环信用户
 *
 * @param clazzItem
 * @param userItem
 * @returns {Promise.<Error>}
 */
pub.registerUserInEasemob = (clazzItem, userItem) => {
  if (!_.isPlainObject(clazzItem) && !_.isPlainObject(userItem)) {
    return Promise.resolve(new Error('参数错误'));
  }

  return pub.registerUserListInEasemob(clazzItem, [userItem])
      .then((emasemobUserList) => {
        debug(emasemobUserList);

        return _.head(emasemobUserList);
      });
};

/**
 * 注册环信用户列表
 *
 * @param emasemobUserList [
 * {
 * username: String,
 * password: String,
 * nickname: String
 * }
 * ]
 */
pub.registerEasemobUserList = (emasemobUserList) => {
  const url = `${ BASE_URL }/users`;

  return requestWithToken.post(url, emasemobUserList)
      .then((registerReuslt) => {
        debug(registerReuslt);

        const registeredUserList = registerReuslt.entities;

        debug(registeredUserList);

        const usernameUserMap = _.keyBy(registeredUserList, 'username');

        // 设置uuid
        _.forEach(emasemobUserList, (emasemobUserItem) => {
          emasemobUserItem.uuid = usernameUserMap[emasemobUserItem.username].uuid
        });

        return emasemobUserList;
      });
};

/**
 * 注册用户列表为环信用户
 *
 * @param clazzItem
 * @param userList
 * @returns {*}
 */
pub.registerUserListInEasemob = (clazzItem, userList) => {
  debug(clazzItem);
  debug(userList);

  if (!_.isPlainObject(clazzItem) && !_.isArray(userList)) {
    return Promise.reject(new Error('参数错误'));
  }

  const parseEmasemobUserPromiseList = _.map(userList, (userItem) => parseUserItemToEasemobUser(clazzItem, userItem));

  return Promise.all(parseEmasemobUserPromiseList)
      .then((emasemobUserList) => {
        debug(emasemobUserList);

        return pub.registerEasemobUserList(emasemobUserList);
      });
};

pub.createEasemobGroup = (easemobGroup) => {
  const chatgroup = {
    groupname: easemobGroup.groupname,
    desc: easemobGroup.desc,
    public: true,
    maxusers: 2000,
    approval: false,
    owner: easemobGroup.owner,
    members: easemobGroup.members
  };

  const url = `${ BASE_URL }/chatgroups`;

  return requestWithToken.post(url, chatgroup)
      .then((createResult) => {
        debug(createResult);

        chatgroup.groupid = createResult.data.groupid;

        delete chatgroup.members;

        return chatgroup;
      });
};

pub.addEasemobGroupUser = (groupId, userName) => {
  const url = getAddGroupUserUrl(groupId, userName);

  return requestWithToken.post(url);
};

pub.blockEasemobGroupUser = (groupId, userName) => {
  const url = getBlockGroupUserUrl(groupId, userName);

  return requestWithToken.post(url);
};

module.exports = pub;
