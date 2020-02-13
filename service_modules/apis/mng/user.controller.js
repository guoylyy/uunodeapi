'use strict';

/**
 * 用户相关服务管理
 *
 *  @function OA 系统当中所有的用户服务在这
 *
 */
const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const systemConfig = require('../../../config/config');
const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const couponSchema = require('./schema/coupon.schema');
const ubandCardSchema = require('./schema/ubandCard.schema');
const commonSchema = require('../common.schema');

const couponService = require('../../services/coupon.service');
const ubandCardService = require('../../services/ubandCard.service');
const userService = require('../../services/user.service');
const wechatTemplateReply = require('../../lib/wechat.template.reply');

const pub = {};

/**
 * 用户复活卡查询
 */
pub.queryUserCard = (req, res) => {
  let userId = req.params.userId;
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        return ubandCardService.queryUserAvailableCard(userId);
      })
      .then((couponList) => {
        debug(couponList);
        return apiRender.renderBaseResult(res, couponList);
      })
      .catch(req.__ERROR_HANDLER);
}

/**
 * 新建用户复活卡
 */
pub.createUserCard = (req, res) => {
  let isNotify = false; //默认不通知客户
  let userId = req.params.userId; // 默认不通知客户

  schemaValidator.validatePromise(ubandCardSchema.createUserCardBodySchema, req.body)
      .then((userCardItem) => {
        debug(userCardItem);

        //新建一个用户表
        isNotify = userCardItem.isNotify;

        return ubandCardService.createUbandCard({
          userId: userId,
          title: userCardItem.title,
          scope: userCardItem.scope,
          type: userCardItem.type,
          expireDate: userCardItem.expireDate,
          remark: userCardItem.remark,
          status: enumModel.ubandCardStatusEnum.AVAILABLE.key
        });

      })
      .then((createdItem) => {
        debug(createdItem);
        if (isNotify === true) {
          //  通知用户
          userService.fetchById(userId)
              .then((userItem) => {
                debug(userItem);
                wechatTemplateReply.sendUbandCardAlertMsg(userItem, '您有一张新的复活卡，点击查看');
              });
        }
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
}

/**
 * 新建用户优惠券
 *  目前优惠券面值需要小于 15
 */
pub.createUserCoupon = (req, res) => {
  let isNotify = false; // 是否通知用户
  let userId = req.params.userId;
  schemaValidator.validatePromise(couponSchema.createCouponBodySchema, req.body)
      .then((couponItem) => {
        debug(couponItem);
        isNotify = couponItem.isNotify;

        return couponService.createCoupon({
          userId: userId,
          money: couponItem.money,
          expireDate: couponItem.expireDate,
          remark: couponItem.remark,
          status: enumModel.couponStatusEnum.AVAILABLE.key
        });
      })
      .then((createItem) => {
        debug(createItem);
        if (isNotify === true) {
          //  通知用户
          userService.fetchById(userId)
              .then((userItem) => {
                debug(userItem);
                wechatTemplateReply.sendCouponAlertMsg(userItem, '您有一张新的优惠券，点击查看');
              });
        }
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询用户所有的可用优惠券
 *
 *  @input {'userId': 1}
 *  @output {'data':['aa','aa']}
 */
pub.queryUserCoupon = (req, res) => {
  let userId = req.params.userId;
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        debug("----------- ------");
        return couponService.fetchAvailableCouponsList(userId);
        })
      .then((couponList) => {
        debug(couponList);
        return apiRender.renderBaseResult(res, couponList);
      })
      .catch(req.__ERROR_HANDLER);
}

/**
 * 删除用户的优惠券
 * @param req
 * @param res
 */
pub.removeUserCoupon = (req, res) =>{
  let userId = req.params.userId;
  let couponId = req.params.couponId;
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        debug("----------- ------");
        return couponService.fetchCouponById(couponId);
      })
      .then((couponItem) => {
        debug(couponItem);
        if(couponItem.userId != userId){
          return apiRender.renderError(res);
        }
        return couponService.destroyCouponById(couponId);
      })
      .then((resultItem) =>{
        if(resultItem){
          return apiRender.renderSuccess(res);
        }
      })
      .catch(req.__ERROR_HANDLER);
}
module.exports = pub;
