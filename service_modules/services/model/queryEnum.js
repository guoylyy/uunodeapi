'use strict';

/**
 * 关于优惠券查询的enum枚举
 */
let couponQueryStatusEnum = {
  'AVAILABLE': {
    key: 'AVAILABLE',
    name: '可使用'
  },
  'EXPIRED': {
    key: 'EXPIRED',
    name: '不可用'
  },
  'ALL':{
    key: 'ALL',
    name: '所有的'
  }
};

let ubandCardQueryStatusEnum = {
  'AVAILABLE': {
    key: 'AVAILABLE',
    name: '可使用'
  },
  'USED': {
    key: 'USED',
    name: '已使用'
  },
  'EXPIRED': {
    key: 'EXPIRED',
    name: '过期的'
  },
  'ALL':{
    key: 'ALL',
    name: '所有的'
  }
};



exports.couponQueryStatusEnum = couponQueryStatusEnum;
exports.ubandCardQueryStatusEnum = ubandCardQueryStatusEnum;
