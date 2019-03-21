'use strict';

const _ = require('lodash');

const pub = {};

/**
 * 获取环信用户名
 *
 * @param isClazzTeacher  是否为班级笃师
 * @param userItem        用户对象
 * @param clazzItem
 * @returns {string}
 */
pub.getEasemobUsername = (isClazzTeacher, userItem, clazzItem) => {
  const userId  = userItem.id,
      clazzId = _.get(clazzItem, 'id');

  // 根据是否为笃师，决定采用的用户名
  return isClazzTeacher && !_.isNil(clazzId) ? `${ clazzId }_${ userId }` : userId;
};

module.exports = pub;
