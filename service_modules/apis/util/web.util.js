'use strict';

const _ = require('lodash');

let pub = {};

/**
 * 筛选UserFile基本信息
 *
 * @param userFileItem
 * @returns {null}
 */
pub.pickUserFileBasicInfo = (userFileItem) => {
  if (_.isNil(userFileItem)) {
    return null;
  }

  let pickedUserFileItem = _.pick(userFileItem, ['id', 'upTime', 'fileType', 'fileName', 'hasCheckined']);

  return pickedUserFileItem;
};

module.exports = pub;
