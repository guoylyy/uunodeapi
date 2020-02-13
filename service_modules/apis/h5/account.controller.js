/**
 * Created by violinsolo on 23/01/2017.
 */
'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');
const winston = require('winston');

const systemConfig = require('../../../config/config');
const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const apiUtil = require('./../util/api.util');
const jwtUtil = require('../util/jwt.util');

const wechatPromotion = require('../../lib/wechat.promotion');

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
const promotionService = require('../../services/promotion.service');

const userBindService = require('../../services/userBind.service');
const systemConfigService = require('../../services/systemConfig.service');
const smsSecurityCodeService = require('../../services/smsSecurityCode.service');
const wechatTemplateReply = require('../../lib/wechat.template.reply');


const isValidSecurityCode = (latestCodeItem, securityCode) => {
  return !_.isNil(latestCodeItem) && securityCode === latestCodeItem.code &&
      moment().isBefore(latestCodeItem.expireAt);
};

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

        const userObj = {id: userItem.id};
        return jwtUtil.sign(userObj, systemConfig.jwt.secretKey, systemConfig.jwt.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * API: POST /account/phoneNumber
 * 账户电话号码绑定
 */
pub.bindPhoneNumber = (req, res) => {
  let bindBody = {};
  schemaValidator.validatePromise(userSchema.bindPhoneNumberBodySchema, req.body)
      .then((params) => {
        bindBody = params;
        //查询手机号是否绑定
        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, bindBody.phoneNumber);
        //查询验证码是否正确
        const fetchLatestCodePromise = smsSecurityCodeService.fetchLatestSecurityCode(enumModel.securityCodeTypeEnum.SMS_LOGIN.key, bindBody.phoneNumber);
        //查询用户是否已经绑定了手机号
        const fetchUserBindRecordPromise = userBindService.fetchUserBindByUserId(enumModel.userBindTypeEnum.PHONE_NUMBER.key, req.__CURRENT_USER.id);

        return Promise.all([fetchUserBindPromise, fetchUserBindRecordPromise, fetchLatestCodePromise])
      })
      .then(([userBindItem, userBindRecords, latestCodeItem]) => {

        if (!isValidSecurityCode(latestCodeItem, bindBody.code)) {
          winston.error(`手机号 ${bindBody.phoneNumber} 及 ${bindBody.code} 验证失败`);
          return apiRender.renderError(res, commonError.BIZ_FAIL_ERROR("验证码错误"));
        }
        if (!_.isNil(userBindItem)) {
          return apiRender.renderError(res, commonError.BIZ_FAIL_ERROR("手机号已被绑定"));
        }
        if (!_.isNil(userBindRecords) && _.size(userBindRecords) > 0) {
          return apiRender.renderError(res, commonError.BIZ_FAIL_ERROR("你已经绑定了手机号，无需重复绑定"));
        }

        return userBindService.createBindUser(
            req.__CURRENT_USER.id,
            enumModel.userBindTypeEnum.PHONE_NUMBER.key,
            bindBody.phoneNumber,
            '&#*(!@&#*@!#^&@*KJHJKSDHKJ*@'//使用永远不能hash的密码
        ).then((result) => {
          //这里需要发放优惠券
          return couponService.createCoupon({
            userId: req.__CURRENT_USER.id,
            money: 10,
            expireDate: moment().add('2', 'M').toDate(),
            remark: '绑定手机号',
            status: enumModel.couponStatusEnum.AVAILABLE.key
          });
        }).then((createItme) => {
          if (!_.isNil(createItme)) {
            userService.fetchById(req.__CURRENT_USER.id)
                .then((userItem) => {
                  debug(userItem);
                  wechatTemplateReply.sendCouponAlertMsg(userItem, '您有一张新的优惠券，点击查看');
                });
            return apiRender.renderSuccess(res);
          } else {
            return apiRender.renderSuccess(res);
          }
        });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 发送登录验证码
 * @param req
 * @param res
 */
pub.sendLoginSmsCode = (req, res) => {
  return schemaValidator.validatePromise(userSchema.sendCodeBodyAuth, req.body)
      .then((codeBody) => {
        debug(codeBody);

        const phoneNumber = codeBody.phoneNumber;
        const fetchUserBindPromise = userBindService.fetchUserBind(enumModel.userBindTypeEnum.PHONE_NUMBER.key, phoneNumber);
        const fetchSmsConfigPromise = systemConfigService.fetchSystemConfigByType(enumModel.systemConfigTypeEnum.SMS_CONFIG.key);

        return Promise.all([fetchUserBindPromise, fetchSmsConfigPromise])
            .then(([userBindItem, smsConfig]) => {
              debug(userBindItem);
              debug(smsConfig);
              if (_.isNil(userBindItem)) {
                winston.error(`手机号 ${phoneNumber} 未注册`);
              }
              return smsSecurityCodeService.sendLoginCode(phoneNumber, 5);
            })
            .then((smsItem) => {
              debug(smsItem);
              return apiRender.renderSuccess(res);
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
  let pickedUserInfo = {};
  let currentUserId = req.__CURRENT_USER.id;
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        //筛选需要的属性
        pickedUserInfo = _.pick(req.__CURRENT_USER, ['id', 'name', 'headImgUrl', 'sex', 'studentNumber', 'birthday', 'target']);
        if (pickedUserInfo.birthday) {
          pickedUserInfo.birthday = moment(pickedUserInfo.birthday).format('YYYY-MM-DD');
        }
        return promotionService.fetchPromotionUserByUserId(currentUserId);
      }).then((promotionUser) => {
    debug(promotionUser);
    if (!_.isNil(promotionUser)) {
      pickedUserInfo['invitationCode'] = promotionUser;
      return {"key": promotionUser.key};
    }
    return promotionService.createPromotionUser(currentUserId, JSON.stringify({"code": "11"}));
  }).then((promotionUserItem) => {

    if (!_.isNil(promotionUserItem)) {
      pickedUserInfo['invitationCode'] = promotionUserItem.key;
    }
    winston.log('StudentNumber', pickedUserInfo.studentNumber);
    if (_.isNil(pickedUserInfo.studentNumber) || pickedUserInfo.studentNumber.length == 0) {
      //用户没有学号，开始生成
      winston.log('用户没有学号，开始生成!');
      return userService.syncUserStudentNumber(pickedUserInfo.id);
    } else {
      return promotionUserItem;
    }
  }).then((userObject) => {
    if (!_.isNil(userObject.studentNumber)) {
      pickedUserInfo['studentNumber'] = userObject.studentNumber;
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
 * 获取用户提现实体数据
 * @param req
 * @param res
 */
pub.getUserWithdraw = (req, res) => {
  const userId = req.__CURRENT_USER.id;
  const withdrawId = req.params.withdrawId;

  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then(() => {
        req.__MODULE_LOGGER('获取提现', withdrawId);
        return userWithdrawService.fetchUserWithdrawInfoById(withdrawId)
      })
      .then((withdrawItem) => {
        if (_.isNil(withdrawItem)) {
          return Promise.reject(commonError.BIZ_FAIL_ERROR("不存在的提现记录"));
        }
        if (withdrawItem.userId === userId) {

          let item = _.pick(withdrawItem, ['id', 'verifiedRemark', 'applyMoney', 'verifiedMoney', 'status', 'verifiedDate', 'applyDate']);

          return apiRender.renderBaseResult(res, item);
        } else {
          return Promise.reject(commonError.BIZ_FAIL_ERROR("不是本人的提款"));
        }
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 * 用户取消提现
 * @param req
 * @param res
 */
pub.userCancelWithdraw = (req, res) => {
  const userId = req.__CURRENT_USER.id;
  const withdrawId = req.params.withdrawId;
  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((queryItem) => {
        req.__MODULE_LOGGER('取消提现', withdrawId);

        return userWithdrawService.fetchUserWithdrawInfoById(withdrawId);
      })
      .then((withdrawItem) => {
        if (_.isNil(withdrawItem)) {
          return Promise.reject(commonError.BIZ_FAIL_ERROR("不存在的提现记录"));
        }
        if (withdrawItem.status != enumModel.withdrawStatusEnum.WAITING.key) {
          return Promise.reject(commonError.BIZ_FAIL_ERROR("当前状态不能取消提现"));
        }
        if (withdrawItem.userId === userId) {
          return userWithdrawService.removeWithdrawRecordbyId(withdrawItem.id);
        } else {
          return Promise.reject(commonError.BIZ_FAIL_ERROR("不能取消别人的提款"));
        }
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
  schemaValidator.validatePromise(userSchema.couponQuerySchema, req.query)
      .then((queryParams) => {
        let status = queryParams.status || 'ALL';
        return couponService.fetchAvailableCouponsList(req.__CURRENT_USER.id, status);
      })
      .then((couponList) => {
        debug(couponList);
        let pickedCouponList = _.map(couponList, (coupon) => {
          //re-construct the structure
          coupon.name = coupon.remark || "";

          return _.pick(coupon, ['id', 'name', 'money', 'expireDate']);
        });

        return apiRender.renderBaseResult(res, pickedCouponList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取优惠券详情列表
 * @param req
 * @param res
 */
pub.fetchCoupon = (req, res) => {
  let couponId = req.params.couponId;
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then(() => {
        if (_.isNil(couponId)) {
          throw commonError.PARAMETER_ERROR("参数错误");
        } else {
          return couponService.fetchCouponById(couponId);
        }
      })
      .then((coupon) => {
        if (!_.isNil(coupon)) {
          let obj = _.pick(coupon, ['id', 'name', 'money', 'expireDate']);
          apiRender.renderBaseResult(res, obj);
        } else {
          throw commonError.BIZ_FAIL_ERROR("没有找到优惠券");
        }
      })
      .catch(req.__ERROR_HANDLER);

  couponService.fetchCouponById()
};

/**
 * 查询用户卡片讯息
 *
 * @param req
 * @param res
 */
pub.queryUserCards = (req, res) => {
  schemaValidator.validatePromise(userSchema.cardQuerySchema, req.query)
      .then((queryParam) => {
        debug(req.__CURRENT_USER.id);
        let status = queryParam.status || 'ALL';
        return ubandCardService.queryUserAvailableCard(req.__CURRENT_USER.id, status);
      }).then((cardList) => {
    let nList = _.map(cardList, (card) => {
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
pub.getUserStudyTarget = (req, res) => {
  var list = ['成为东八区最努力的英语学习者', '过CATTI英语翻译考试', '雅思英语考试得高分',
    '做东半球会流利说英语的崽', '去英语国家自助旅游一次', '被5000个英语单词',
    '读10本英语书籍'];
  return apiRender.renderBaseResult(res, {targets: list});
};

/**
 * 设置用户目标
 *
 * @param target String
 */
pub.updateUserTarget = (req, res) => {
  schemaValidator.validatePromise(userSchema.targetUpdateSchema, req.query)
      .then((queryParam) => {
        debug(req.__CURRENT_USER.id);
        let target = queryParam.target;
        if (target.includes('英语') || target.includes('英文')) {
          //更新用户目标字段
          var userPrivacy = {};
          userPrivacy.target = target;
          return userService.updateUserItem(req.__CURRENT_USER.id, userPrivacy);
        } else {
          throw commonError.BIZ_FAIL_ERROR("目标必须含有「英文」或「英语」二字");
        }
      }).then((data) => {
    return apiRender.renderSuccess(res);
  })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
