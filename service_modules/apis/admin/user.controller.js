'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const userSchema = require('./schema/user.schema');
const commonSchema = require('../common.schema');

const systemConfig = require('../../../config/config');
const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const apiUtil = require('../util/api.util');

const wechatUser = require('../../lib/wechat.user');

const userService = require('../../services/user.service');
const userCoinService = require('../../services/userCoin.service');
const couponService = require('../../services/coupon.service');
const userPayService = require('../../services/userPay.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const clazzService = require('../../services/clazz.service');

const wechatTemplateReply = require('../../lib/wechat.template.reply');


/**
 * 筛选用户付款基本信息
 *
 * @param userPayItem
 */
const pickBasicUserPayInfo = (userPayItem) => {
  const pickedUserPayItem = _.pick(userPayItem, ['id', 'status', 'payTime']);

  pickedUserPayItem.totalFee = (_.get(userPayItem, 'payInfo.signData.totalFee', 0) / 100).toFixed(2);

  const bill = JSON.parse(_.get(userPayItem, 'bill'));
  if (!_.isNil(bill)) {
    bill.money = (_.get(bill, 'money', 0) / 100).toFixed(2);
  }
  pickedUserPayItem.bill = bill;

  return pickedUserPayItem;
};

/**
 * 为用户付款记录填充班级信息
 *
 * @param clazzList
 * @param clazzAccountList
 * @param userPayList
 * @returns {Array}
 */
const fillUserPayWithClazzInfo = (clazzList, clazzAccountList, userPayList) => {
  // 构造班级id -> 班级基本信息的map
  const clazzMap = _.reduce(
      clazzList,
      (clazzMap, clazzItem) => {

        const pickedClazzInfo = apiUtil.pickClazzBasicInfo(clazzItem);
        pickedClazzInfo.promotionOffer = _.get(clazzItem, ['configuration', 'promotionOffer'], {});

        clazzMap[clazzItem.id] = pickedClazzInfo;
        return clazzMap;
      },
      {}
  );

  debug(clazzMap);

  // 构造clazzAccountId -> 班级基本信息的map
  const accountClazzMap = _.reduce(
      clazzAccountList,
      (accountClazzMap, clazzAccountItem) => {

        accountClazzMap[clazzAccountItem.id] = clazzMap[clazzAccountItem.clazzId];

        return accountClazzMap;
      },
      {}
  );

  debug(accountClazzMap);

  // 班级信息默认值
  const defaultClazzInfo = {
    id: -1,
    name: '未知班级',
    description: '未知',
    banner: '未知'
  };

  return _.map(userPayList, (userPayItem) => {
    // 筛选基本信息
    const pickedUserPayItem = pickBasicUserPayInfo(userPayItem);

    // 填充班级信息，确保有默认值
    pickedUserPayItem.clazzInfo = accountClazzMap[userPayItem.outBizId] || defaultClazzInfo;

    return pickedUserPayItem;
  });
};

let pub = {};

/**
 * 分页查询用户列表
 *
 * @param req
 * @param res
 */
pub.queryPagedUserList = (req, res) => {
  schemaValidator.validatePromise(userSchema.userQuerySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        // 分页获取学员
        return userService.queryPagedUsers(queryParams.pageNumber, queryParams.pageSize, queryParams.searchType, queryParams.keyword, queryParams.status);
      })
      .then((pagedUser) => {
        debug(pagedUser);

        // 过滤信息
        let userList = _.map(pagedUser.values, apiUtil.pickUserBasicInfo);

        return apiRender.renderPageResult(res, userList, pagedUser.itemSize, pagedUser.pageSize, pagedUser.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 新建用户优币记录
 *
 * @param req
 * @param res
 */
pub.createUserCoinItem = (req, res) => {
  let isNotify = false; // 是否通知用户
  schemaValidator.validatePromise(userSchema.createCoinBodySchema, req.body)
      .then((coinItem) => {
        debug(coinItem);

        isNotify = coinItem.isNotify;

        return userCoinService.createUserCoin({
          userId: req.__CURRENT_USER_ITEM.id, // 使用当前学员的id
          coinChange: coinItem.coinChange,
          title: coinItem.title,
          bizType: coinItem.bizType,
          remark: coinItem.remark,
          changeDate: new Date()
        });
      })
      .then((createdCoinItem) => {
        debug(createdCoinItem);

        if (isNotify) {
          // 通知用户
          let coinChangeStr;
          if (createdCoinItem.coinChange >= 0) {
            coinChangeStr = `+${ createdCoinItem.coinChange }`;
          } else {
            coinChangeStr = `${ createdCoinItem.coinChange }`;
          }

          // 推送回复消息成功
          wechatTemplateReply.sendGambicoinChangeMsg(
              req.__CURRENT_USER_ITEM,
              coinChangeStr,
              '可以在 个人中心 -> 我的优币 中查看或进行提现操作',
              createdCoinItem.title
          );
        }

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询用户优币列表
 *
 * @param req
 * @param res
 */
pub.queryUserCoinList = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);

        return userCoinService.queryUserCoins(req.__CURRENT_USER_ITEM.id);
      })
      .then((userCoins) => {
        debug(userCoins);

        _.reduceRight(
            userCoins,
            (sum, userCoin) => {
              // 累加
              sum += userCoin.coinChange;
              // 更新
              userCoin.sum = sum;
              // 返回
              return sum;
            },
            0 // 初始值
        );

        // 筛选信息
        _.map(userCoins, (userCoin) => _.pick(userCoin, ['id', 'coinChange', 'remark', 'title', 'changeDate', 'sum']));

        return apiRender.renderBaseResult(res, userCoins);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 新建优惠券
 *
 * @param req
 * @param res
 */
pub.createUserCoupon = (req, res) => {
  let isNotify = false; // 是否通知用户
  schemaValidator.validatePromise(userSchema.createCouponBodySchema, req.body)
      .then((couponItem) => {
        debug(couponItem);

        isNotify = couponItem.isNotify;

        couponService.createCoupon({
          userId: req.__CURRENT_USER_ITEM.id,
          money: couponItem.money,
          expireDate: couponItem.expireDate,
          remark: couponItem.remark,
          status: enumModel.couponStatusEnum.AVAILABLE.key
        });
      })
      .then((createdCouponItem) => {
        debug(createdCouponItem);

        // 通知用户
        if (isNotify === true) {
          wechatTemplateReply.sendCouponAlertMsg(req.__CURRENT_USER_ITEM, '您获得了一张优惠券, 可进入 "个人中心" 查看.');
        }

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询用户退款记录列表
 *
 * @param req
 * @param res
 */
pub.queryUserPayList = (req, res) => {
  let withClazz = false; // 记录是否需查询班级信息
  schemaValidator.validatePromise(userSchema.userPayQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        withClazz = queryParam.withClazz;

        return userPayService.queryUserPayList(req.__CURRENT_USER_ITEM.id, queryParam.status);
      })
      .then((userPayList) => {
        debug(userPayList);
        // 匹配课程信息
        if (withClazz === true) {
          const clazzAccountIdList = _.reduce(
              userPayList,
              (clazzAccountIdList, userPay) => {
                const outBizType = _.get(userPay, 'outBizType', null),
                    clazzAccountId = _.get(userPay, 'outBizId', null);

                if (enumModel.userPayOutbizTypeEnum.CLAZZPAY.key === outBizType) {
                  clazzAccountIdList.push(clazzAccountId);
                }

                return clazzAccountIdList;
              },
              []
          );

          return clazzAccountService.queryClazzAccountListByIds(clazzAccountIdList)
              .then((clazzAccountList) => {
                const clazzIdList = _.map(clazzAccountList, 'clazzId');

                if (_.isEmpty(clazzIdList)) {
                  return Promise.resolve([]);
                }

                return clazzService.queryClazzes(null, clazzIdList, null, null)
                    .then((clazzList) => {
                      return fillUserPayWithClazzInfo(clazzList, clazzAccountList, userPayList);
                    });
              });
        }

        return _.map(userPayList, pickBasicUserPayInfo);
      })
      .then((pickedUserPayList) => {
        debug(pickedUserPayList);
        const couponIds = _.map(pickedUserPayList, 'bill.coupon.id', null);
        debug(couponIds);

        // 获取并匹配优惠卷
        return couponService.fetchCouponListByIds(couponIds)
            .then((couponList) => {
              const couponMap = _.keyBy(couponList, 'id');

              _.forEach(pickedUserPayList, (userPay) => {
                const couponId = _.get(userPay, ['bill', 'coupon', 'id'], null);
                debug(couponId);
                const coupon = couponMap[couponId];
                if (coupon) {
                  userPay.bill.coupon.money = coupon.money;
                }
              });

              return apiRender.renderBaseResult(res, pickedUserPayList);
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取学员详情
 *
 * @param req
 * @param res
 */
pub.fetchUserDetailInfo = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(
            res,
            _.omit(req.__CURRENT_USER_ITEM, ['invitatedBy', 'invitatedByObjectId', 'saltHashedPassword', 'timezoneUpdatedAt', 'hasFillInfo', 'objectId'])
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 同步学员列表
 *
 * @param req
 * @param res
 */
pub.syncUserList = (req, res) => {
  schemaValidator.validatePromise(userSchema.syncUserSchema, req.body)
      .then((queryParams) => {
        debug(queryParams);

        // 查询满足条件的学员列表
        return userService.queryUserBySearchType(queryParams.searchType, queryParams.keyword, queryParams.status);
      })
      .then((userList) => {
        const userListSize = _.size(userList);
        debug(userListSize);
        // todo 修改为配置
        if (userListSize > 100) {
          return Promise.reject(commonError.BIZ_FAIL_ERROR('需要同步的用户数过多，无法处理！'));
        }

        return wechatUser.syncUserInfoList(userList);
      })
      .then((updatedUserList) => {
        debug(updatedUserList);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
