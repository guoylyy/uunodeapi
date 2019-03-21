'use strict';

const _ = require('lodash');
const moment = require('moment');
const winston = require('winston');
const Promise = require('bluebird');
const debug = require('debug')('service');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const userService = require('./user.service');
const couponMapper = require('../dao/mysql_mapper/coupon.mapper');

let pub = {};

/**
 * 获取用户（userId）可用的且小于 clazzFee 的最大优惠券
 *
 * @param userId
 * @param clazzFee
 * @returns {*}
 */
pub.fetchMaxCoupon = (userId, clazzFee) => {
  if (_.isNil(userId) || !_.isNumber(clazzFee)) {
    winston.error('获取优惠券列表失败，参数错误!!! userId: %s, clazzFeed: %s', userId, clazzFee);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  debug(userId);
  debug(clazzFee);

  return couponMapper.fetchCouponByParams({
    userId: userId,
    status: enumModel.couponStatusEnum.AVAILABLE.key,
    expireDate: { operator: '>=', value: moment().format('YYYY-MM-DD HH:mm:ss') },
    money: { operator: '<=', value: clazzFee }
  });
};

/**
 * 获取所有的 `AVAILABLE` 的 `未过期` 的用户id为 userId 的优惠券列表
 * @param userId 待查询用户id
 * @returns {*}
 */
pub.fetchAvailableCouponsList = (userId) => {
  if (_.isNil(userId)) {
    winston.error('获取优惠券列表失败，参数错误!!! userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return couponMapper.fetchAllCouponByParams(
      {
        userId: userId,
        status: enumModel.couponStatusEnum.AVAILABLE.key,
        expireDate: { operator: '>=', value: moment().format('YYYY-MM-DD HH:mm:ss') }
      });
};

/**
 * 根据id列表获取优惠券列列表
 *
 * @param couponIdList
 * @returns {*}
 */
pub.fetchCouponListByIds = (couponIdList) => {
  if (!_.isArray(couponIdList)) {
    winston.error('获取优惠券列表失败，参数错误!!! couponIdList: %s', couponIdList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const idList = _.filter(couponIdList, (couponId) => !_.isNil(couponId));
  debug(idList);

  if (_.isEmpty(idList)) {
    return Promise.resolve([]);
  }

  return couponMapper.fetchAllCouponByParams({
    id: idList
  });
};

/**
 * 根据id获取coupon信息
 *
 * @param couponId
 * @returns {*}
 */
pub.fetchCouponById = (couponId) => {
  if (_.isNil(couponId)) {
    winston.error('获取优惠券失败，参数错误!!! couponId: %s', couponId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return couponMapper.fetchCouponByParams({ id: couponId })
};

/**
 * 更新coupon信息
 *
 * @param couponItem
 * @returns {*}
 */
pub.updateCoupon = (couponItem) => {
  if (!_.isPlainObject(couponItem) || _.isNil(couponItem.id)) {
    winston.error('更新优惠券失败，参数错误!!! coupon: %j', couponItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 校验coupon的状态
  if (couponItem.status) {
    if (!_.includes(_.keys(enumModel.couponStatusEnum), couponItem.status)) {
      winston.error('更新优惠券失败，参数错误!!! coupon: %j', couponItem);
      return Promise.reject(commonError.PARAMETER_ERROR());
    }
  }

  return couponMapper.update(couponItem);
};

/**
 * 新建优惠券
 *
 * @param couponItem
 * @returns {Promise.<TResult>}
 */
pub.createCoupon = (couponItem) => {
  if (!_.isPlainObject(couponItem) || !_.isNil(couponItem.id)) {
    winston.error('创建优惠券失败，参数错误！！！couponItem: %j', couponItem);
  }
  return couponMapper.create(couponItem);
};

/**
 * 为一个ID新建优惠券
 *
 * @input: @userId, @expiredDate, @couponMoney
 */
pub.createUserCoupon = (userId, expiredDate, couponMoney) =>{
  if(_.isNil(userId) || _.isNil(expiredDate) || _.isNil(couponMoney)){
    winston.error('创建优惠券失败，参数错误！！！userId: %j %j %d', userId, expiredDate, couponMoney);
  }

  let couponItem = {
    money: couponMoney,
    remark: '优惠券',
    status: enumModel.couponStatusEnum.AVAILABLE.key,
    userId: userId,
    expireDate: expiredDate
  };

  return couponMapper.create(couponItem);
};


/**
 * [admin] 分页获取优惠券列表
 *
 * @param pageNumber
 * @param pageSize
 * @param couponStatus
 * @param searchType
 * @param keyword
 */
pub.fetchPagedCoupons = (pageNumber, pageSize, couponStatus, searchType, keyword) => {
  debug(pageNumber);
  debug(pageSize);
  debug(couponStatus);
  debug(searchType);
  debug(keyword);

  const isSearchTypeNil = _.isNil(searchType),
      isKeywordNil = _.isNil(keyword);

  debug(isKeywordNil);
  debug(isKeywordNil);

  if (!_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 当isSearchTypeNil及isKeywordNil中一方为Nil而另一方不为Nil
  if ((isSearchTypeNil && !isKeywordNil) || (!isSearchTypeNil && isKeywordNil)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 优惠券查询参数
  const couponQueryParam = {};

  // 当couponStatus不为空
  if (!_.isNil(couponStatus)) {
    // 非enumModel.couponStatusEnum中的成员时 参数错误
    if (_.isNil(enumModel.getEnumByKey(couponStatus, enumModel.couponStatusEnum))) {
      return Promise.reject(commonError.PARAMETER_ERROR());
    }

    // 设置status
    couponQueryParam.status = couponStatus;
  }

  pageNumber = pageNumber || 1;
  pageSize = pageSize || 10;

  let fetchCouponAndUserPromise;

  // 根据查询类型是否为空来决定如何获取优惠券列表及用户信息
  if (isSearchTypeNil) {
    /*
     1. 先获取优惠券列表
     2. 获取优惠券对应的用户列表
     */
    fetchCouponAndUserPromise = couponMapper.queryPagedCoupons(couponQueryParam, pageNumber, pageSize)
        .then((pagedCoupons) => {
          let userIds = _.map(pagedCoupons.values, 'userId');

          return userService.queryUser(null, userIds)
              .then((userList) => [pagedCoupons, userList]);
        })
  } else {
    /*
     1. 先根据查询条件获取用户列表
     2. 根据用户列表获取优惠券列表
     */
    fetchCouponAndUserPromise = userService.queryUserBySearchType(searchType, keyword)
        .then((userList) => {
          couponQueryParam.userId = _.map(userList, 'id');

          return couponMapper.queryPagedCoupons(couponQueryParam, pageNumber, pageSize)
              .then((pagedCoupons) => [pagedCoupons, userList]);
        })
  }

  return fetchCouponAndUserPromise.then(
      (results) => {
        debug(results);

        const pagedCoupons = results[0],
            userList = results[1];

        const couponList = pagedCoupons.values;

        const userMap = _.keyBy(userList, 'id');

        _.forEach(couponList, (coupon) => {
          coupon.userInfo = userMap[coupon.userId];
        });

        return pagedCoupons;
      }
  )
};

/**
 * 根据id移除优惠券
 *
 * @param couponId
 * @returns {*}
 */
pub.destroyCouponById = (couponId) => {
  if (!_.isInteger(couponId)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return couponMapper.destroy(couponId);
};

module.exports = pub;
