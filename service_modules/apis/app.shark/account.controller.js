'use strict';

/**
 * 用户相关API
 */

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const systemConfig = require('../../../config/config');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const apiUtil = require('../util/api.util');
const jwtUtil = require('../util/jwt.util');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const accountSchema = require('./schema/account.schema');

const userService = require('../../services/user.service');
const userBindService = require('../../services/userBind.service');
const couponService = require('../../services/coupon.service');
const ubandCardService = require('../../services/ubandCard.service');

const enumModel = require('../../services/model/enum');

const pub = {};

/**
 * API: POST /user/auth
 * 账户登录，用户认证
 *
 * @param req
 * @param res
 */
pub.auth = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userLoginBodySchema, req.body)
      .then((loginUser) => {
        debug(loginUser);
        return userService.login(loginUser.username, loginUser.password)
      })
      .then((userItem) => {
        debug(userItem);
        if (!userItem) {
          return apiRender.renderError(res, commonError.UNAUTHORIZED_ERROR('用户名与密码不匹配'));
        }

        const userObj = { appUserId: userItem.id };

        return jwtUtil.sign(userObj, systemConfig.jwt_app_shark.secretKey, systemConfig.jwt_app_shark.options)
            .then((token) => {
              res.set('X-Auth-Token', token);

              return apiRender.renderBaseResult(res, apiUtil.pickUserBasicInfo(userItem));
            });
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 检查token是否有效
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.checkAuth = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderSuccess(res);
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
        debug(queryParam);

        const currentUser = req.__CURRENT_USER;

        //筛选需要的属性
        const pickedUserInfo = _.pick(currentUser, ['id', 'name', 'headImgUrl', 'sex', 'studentNumber', 'birthday', 'openId']);
        
        // 处理生日日期
        if (pickedUserInfo.birthday) {
          pickedUserInfo.birthday = moment(pickedUserInfo.birthday).format('YYYY-MM-DD');
        }

        return apiRender.renderBaseResult(res, pickedUserInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新用户基本信息
 *
 * @param req
 * @param res
 */
pub.updateUserInfo = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userInfoUpdateSchema, req.body)
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
 * 更新用户私有信息
 *
 * @param req
 * @param res
 */
pub.updateUserPrivacy = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.userPrivacyUpdateSchema, req.body)
      .then((userPrivacy) => {
        debug(userPrivacy);

        req.__MODULE_LOGGER('更新用户私有信息', userPrivacy);

        return userService.updateUserItem(req.__CURRENT_USER.id, userPrivacy);
      })
      .then((userItem) => {
        debug(userItem);

        return apiRender.renderSuccess(res);
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
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        // 是否绑定手机号
        return userBindService.fetchUserBindByUserId(enumModel.userBindTypeEnum.PHONE_NUMBER.key, req.__CURRENT_USER.id);
      })
      .then((userBindItem) => {
        debug(userBindItem);
        //筛选需要的属性
        let result = _.pick(req.__CURRENT_USER, ['id', 'alipay', 'timezone', 'realName']);
        result.hasBindPhone = !_.isNil(userBindItem);
        result.phoneNumber = _.get(userBindItem, 'accountName', null);

        // 是否绑定微信
        result.hasBindWechat = !_.isNil(req.__CURRENT_USER.openId);

        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取学员优惠券列表
 *
 * @param req
 * @param res
 */
pub.fetchCouponList = (req, res) => {
  return schemaValidator.validatePromise(accountSchema.cardQuerySchema, req.query)
      .then((queryParams) => {
        debug(queryParams);
        let status = queryParams['status'];

        return couponService.fetchAvailableCouponsList(req.__CURRENT_USER.id, status);
      })
      .then((couponList) => {
        debug(couponList);

        const pickedCouponList = _.map(couponList, (coupon) => ({
          name: _.get(coupon, 'remark', "抵用券"),
          id: _.get(coupon,'id', null),
          money: _.get(coupon, 'money', 0),
          expireDate: moment(_.get(coupon, 'expireDate', new Date())).format('YYYY-MM-DD')
        }));

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
pub.fetchUserCards = (req, res) => {
  schemaValidator.validatePromise(accountSchema.cardQuerySchema, req.query)
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

module.exports = pub;
