'use strict';

const winston = require('winston');

let pub = {};

/**
 * 模块log消息
 *
 * @param module
 * @param userId
 */
pub.getLogger = (module, userId) => (action, params) => {
  // 例子： [ h5] 用户 [ 261 ] 修改个人信息， 参数为 {birthday: 2016-12-12}
  winston.info('[ %s ] 用户 [ %s ] %s，参数为 %j', module, userId, action, params);
};

module.exports = pub;
