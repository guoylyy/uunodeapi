/**
 * Created by violinsolo on 23/01/2017.
 */
'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const systemConfig = require('../../../config/config');
const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const apiUtil = require('./../util/api.util');
const jwtUtil = require('../util/jwt.util');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const userSchema = require('./schema/user.schema');

const userService = require('../../services/user.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const couponService = require('../../services/coupon.service');
const userCoinSerivice = require('../../services/userCoin.service');
const userWithdrawService = require('../../services/userWithdraw.service');
const userRankService = require('../../services/userRank.service');
const ubandCardService = require('../../services/ubandCard.service');

const pub = {};

/**
 * API: POST /user/auth
 * 账户登录，用户认证
 *
 * @param req
 * @param res
 */
pub.auth = (req, res) => {
  schemaValidator.validatePromise(userSchema.userLoginBodySchema, req.body)
      .then((loginUser) => {
        debug(loginUser);
        return userService.login(loginUser.username, loginUser.password)
      })
      .then((userItem) => {
        debug(userItem);
        if (!userItem) {
          return apiRender.renderError(res, commonError.UNAUTHORIZED_ERROR('用户名与密码不匹配'));
        }

        const userObj = { id: userItem.id };
        return jwtUtil.sign(userObj, systemConfig.jwt.secretKey, systemConfig.jwt.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: GET /account
 * 获取个人信息，由于API相关信息已经存在于req.__CURRENT_USER 中，所以直接获取，不查询数据库
 *
 * @param req
 * @param res
 * @returns {*}
 */
pub.getUserBaseInfo = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        //筛选需要的属性
        let pickedUserInfo = _.pick(req.__CURRENT_USER, ['id', 'name', 'headImgUrl', 'sex', 'studentNumber', 'birthday','target']);

        if (pickedUserInfo.birthday) {
          pickedUserInfo.birthday = moment(pickedUserInfo.birthday).format('YYYY-MM-DD');
        }

        return apiRender.renderBaseResult(res, pickedUserInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: GET /account/privacy
 * 获取私人信息
 *
 * @param req
 * @param res
 */
pub.fetchUserPrivacy = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        //筛选需要的属性
        let result = _.pick(req.__CURRENT_USER, ['id', 'phoneNumber', 'wechat', 'alipay', 'timezone', 'realName']);

        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: POST /account/privacy
 * 更新个人私有信息
 *
 * @param req
 * @param res
 */
pub.updateUserPrivacy = (req, res) => {
  schemaValidator.validatePromise(userSchema.updateUserPrivacyBodySchema, req.body)
      .then((userPrivacy) => {
        debug(userPrivacy);

        req.__MODULE_LOGGER('更新私有信息', userPrivacy);

        // 限制时区更新次数
        if (!_.isNil(userPrivacy.timezone)) {
          // 用户上次更新timezone时间
          const timezoneUpdatedAt = req.__CURRENT_USER.timezoneUpdatedAt,
              nowMoment = moment();

          debug(timezoneUpdatedAt);

          /*
           1. 如果timezoneUpdated不为null
           2. 且 当前时间与timezoneUpdatedAt在同一个月
           */
          if (timezoneUpdatedAt != null && nowMoment.isSame(timezoneUpdatedAt, 'month')) {
            return Promise.reject(commonError.PARAMETER_ERROR('时区每月限更新1次'));
          }

          req.__MODULE_LOGGER('更新打卡时区', userPrivacy.timezone);
          userPrivacy.timezoneUpdatedAt = nowMoment.toDate();
        }

        return userService.updateUserItem(req.__CURRENT_USER.id, userPrivacy);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: GET /account/password
 * 查询用户是否已经设置过密码
 * 目前采用判断 user.saltHashedPassword 字段是否为空来判断是否设置过密码，更新字段会引起改动
 *
 * @param req
 * @param res
 * @returns {*}
 */
pub.checkPasswordExist = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        let hasSet = userService.checkHasSetPassword(req.__CURRENT_USER);

        debug('set Password : ' + hasSet);
        return apiRender.renderBaseResult(res, hasSet);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: PUT /account/password
 * 初始化用户密码
 *
 * @param req
 * @param res
 * @returns {*}
 */
pub.initialPassword = (req, res) => {
  let currentUser = req.__CURRENT_USER;
  debug(currentUser);

  schemaValidator.validatePromise(userSchema.initUserPasswordBodySchema, req.body)
      .then((initPassword) => {
        req.__MODULE_LOGGER('初始化密码', null);

        // 检查用户是否已经设置过密码
        if (userService.checkHasSetPassword(currentUser)) {
          return apiRender.renderParameterError(res, '当前用户已经设置了密码!');
        }

        return userService.setUserPassword(currentUser, null, initPassword.password);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: POST /account/password
 * 更新用户密码
 *
 * @param req
 * @param res
 */
pub.updatePassword = (req, res) => {
  let currentUser = req.__CURRENT_USER;
  debug(currentUser);

  schemaValidator.validatePromise(userSchema.updateUserPasswordBodySchema, req.body)
      .then((updatePassword) => {
        req.__MODULE_LOGGER('更新密码', null);

        // 检查用户是否已经设置过密码
        if (!userService.checkHasSetPassword(currentUser)) {
          return apiRender.renderParameterError(res, '当前用户尚未初始化密码!');
        }

        return userService.setUserPassword(currentUser, updatePassword.oldPassword, updatePassword.password);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: GET /account/coins
 * 获取学员优币记录
 *
 * @param req
 * @param res
 */
pub.fetchCoins = (req, res) => {
  let currentUser = req.__CURRENT_USER;

  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        return Promise.all([userCoinSerivice.queryUserCoins(currentUser.id), userCoinSerivice.sumUserCoin(currentUser.id)]);
      })
      .then((results) => {
        let coinList = results[0],
            coinSum = results[1] || 0;

        debug(coinSum, coinList);

        // 逆序计算账户余额
        let sum = 0;
        _.forEachRight(coinList, (coinItem) => {
          sum += _.toNumber(coinItem.coinChange) || 0;
          coinItem.sum = sum;
        });

        return apiRender.renderBaseResult(res, {
          sum: coinSum,
          values: _.map(coinList, (coin) => _.pick(coin, ['id', 'title', 'changeDate', 'coinChange', 'sum']))
        })
      })
      .catch(req.__ERROR_HANDLER);

};

/**
 * API: DELETE /account/coins
 * 学员提现，优币提现
 *
 * @param req
 * @param res
 */
pub.userWithdraw = (req, res) => {
  schemaValidator.validatePromise(userSchema.userWithdrawBodySchema, req.body)
      .then((withdrawItem) => {
        debug(withdrawItem);

        req.__MODULE_LOGGER('提现优币', withdrawItem);

        return userWithdrawService.userWithdrawCoins(req.__CURRENT_USER.id, withdrawItem.coins, withdrawItem.payway, withdrawItem.username, withdrawItem.remark);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: GET /account/coupons
 * 获取学员优惠券列表
 *
 * @param req
 * @param res
 */
pub.fetchCouponList = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParams) => {
        return couponService.fetchAvailableCouponsList(req.__CURRENT_USER.id);
      })
      .then((couponList) => {
        debug(couponList);
        let pickedCouponList = _.map(couponList, (coupon) => {
          //re-construct the structure
          coupon.name = coupon.remark || "";

          return _.pick(coupon, ['name', 'money', 'expireDate']);
        });

        return apiRender.renderBaseResult(res, pickedCouponList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询用户卡片讯息
 *
 * @param req
 * @param res
 */
pub.queryUserCards = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(req.__CURRENT_USER.id);
        return ubandCardService.queryUserAvailableCard(req.__CURRENT_USER.id);
  }).then((cardList) => {
        let nList = _.map(cardList, (card) =>{
          card.type = enumModel.getEnumByKey(card.type, enumModel.ubandCardTypeEnum);
          card.status = enumModel.getEnumByKey(card.status, enumModel.ubandCardStatusEnum);
          card.scope = enumModel.getEnumByKey(card.scope, enumModel.ubandCardScopeEnum);

          return card;
        });
        return apiRender.renderBaseResult(res, nList);
  })
  .catch(req.__ERROR_HANDLER);
};


/**
 * 查询用户提现记录
 *
 * @param req
 * @param res
 */
pub.queryUserWithdraws = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        return userWithdrawService.queryUserWithdraws(req.__CURRENT_USER.id);
      })
      .then((withdrawList) => {
        let pickWithdrawList = _.map(withdrawList, (withdraw) => _.pick(withdraw, ['id', 'applyMoney', 'applyDate', 'status']));
        return apiRender.renderBaseResult(res, pickWithdrawList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户当前优币余额
 *
 * @param req
 * @param res
 */
pub.calculateUserCoinSum = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        return userCoinSerivice.sumUserCoin(req.__CURRENT_USER.id);
      })
      .then((coinSum) => {
        debug(coinSum);
        return apiRender.renderBaseResult(res, coinSum);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新用户基本信息
 *
 * @param req
 * @param res
 */
pub.updateUserBaseInfo = (req, res) => {
  schemaValidator.validatePromise(userSchema.updateUserBaseInfoBodySchema, req.body)
      .then((baseInfo) => {
        debug(baseInfo);

        req.__MODULE_LOGGER('更新用户基本信息', baseInfo);

        return userService.updateUserItem(req.__CURRENT_USER.id, baseInfo);
      })
      .then((userItem) => {
        debug(userItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户护照信息
 *
 * @param req
 * @param res
 */
pub.fetchUserPassport = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        req.__MODULE_LOGGER('获取用户护照信息', queryParam);

        return userService.fetchUserPassportByUserId(req.__CURRENT_USER.id);
      })
      .then((userPassportItem) => {
        debug(userPassportItem);

        const userBaseInfo = _.pick(req.__CURRENT_USER, ['sex', 'city', 'birthday', 'hasFillInfo']),
            pickedPassportInfo = _.pick(userPassportItem, ['userEnglishLevel', 'userSelfIdentity', 'preferLearningMode']);


        if (userBaseInfo.birthday) {
          userBaseInfo.birthday = moment(userBaseInfo.birthday).format('YYYY-MM-DD');
        }

        return apiRender.renderBaseResult(res, _.extend(
            {
              userEnglishLevel: null,
              userSelfIdentity: null,
              preferLearningMode: null
            },
            userBaseInfo,
            pickedPassportInfo)
        );
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新用户护照信息
 *
 * @param req
 * @param res
 */
pub.updateUserPassport = (req, res) => {
  schemaValidator.validatePromise(userSchema.createUserPassportBodySchema, req.body)
      .then((userPassport) => {

        req.__MODULE_LOGGER('更新用户护照信息', userPassport);

        const userBaseInfo = _.pick(userPassport, ['sex', 'city', 'birthday']),
            pickedPassportInfo = _.pick(userPassport, ['userEnglishLevel', 'userSelfIdentity', 'preferLearningMode']);

        userBaseInfo.hasFillInfo = true;

        debug(userBaseInfo);
        debug(pickedPassportInfo);

        const updatePassportPromise = userService.updateUserPassportByUserId(req.__CURRENT_USER.id, pickedPassportInfo),
            updateUserInfoPromise = userService.updateUserItem(req.__CURRENT_USER.id, userBaseInfo);

        return Promise.all([updatePassportPromise, updateUserInfoPromise]);
      })
      .then((results) => {
        debug(results);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询排行榜
 *
 * @param req
 * @param res
 */
pub.queryUserRank = (req, res) => {
  return schemaValidator.validatePromise(userSchema.rankQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const fetchUserRankItemPromise = userRankService.queryUserRankItem(queryParam.type, req.__CURRENT_USER);
        const queryUserRankListPromise = userRankService.queryUserRankList(queryParam.type);

        return Promise.all([fetchUserRankItemPromise, queryUserRankListPromise]);
      })
      .then(([userRankItem, userRankList]) => {
        debug(userRankItem);
        debug(userRankList);

        const pickedUserRank = apiUtil.pickUserRank(userRankItem);
        const pickedUserRankList = _.map(userRankList, apiUtil.pickUserRank);

        return apiRender.renderBaseResult(res, {item: pickedUserRank, list: pickedUserRankList});
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户目标列表
 * 
 * @param 无
 */
pub.getUserStudyTarget = (req, res) =>{
  var list = ['成为东八区最努力的英语学习者', '过CATTI英语翻译考试', '雅思英语考试得高分',
              '做东半球会流利说英语的崽', '去英语国家自助旅游一次', '被5000个英语单词',
              '读10本英语书籍'];
  return apiRender.renderBaseResult(res, {targets:list});
};

/**
 * 设置用户目标
 * 
 * @param target String
 */
pub.updateUserTarget = (req,res)=>{
  schemaValidator.validatePromise(userSchema.targetUpdateSchema, req.query)
  .then((queryParam) => {
      debug(req.__CURRENT_USER.id);
      let target = queryParam.target;
      if(target.includes('英语') || target.includes('英文')){
        //更新用户目标字段
        var userPrivacy = {};
        userPrivacy.target = target;
        return userService.updateUserItem(req.__CURRENT_USER.id, userPrivacy);
      }else{
        throw commonError.BIZ_FAIL_ERROR("目标必须含有「英文」或「英语」二字");
      }
  }).then((data) => {
      return apiRender.renderSuccess(res);
  })
  .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
