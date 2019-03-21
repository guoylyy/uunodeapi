'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const couponSchema = require('./schema/coupon.schema');

const apiRender = require('../render/api.render');

const couponService = require('../../services/coupon.service');
const userService = require('../../services/user.service');

const wechatTemplateReply = require('../../lib/wechat.template.reply');

let pub = {};

/**
 * 分页查询优惠券列表，带用户信息
 *
 * @param req
 * @param res
 */
pub.queryPagedCouponList = (req, res) => {
  schemaValidator.validatePromise(couponSchema.couponQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return couponService.fetchPagedCoupons(queryParam.pageNumber, queryParam.pageSize, queryParam.status, queryParam.searchType, queryParam.keyword);
      })
      .then((pagedCoupons) => {
        debug(pagedCoupons);

        const couponList = _.map(
            pagedCoupons.values,
            (coupon) => _.pick(
                coupon,
                ['id', 'money', 'status', 'createdAt', 'expireDate', 'userInfo.id', 'userInfo.headImgUrl', 'userInfo.name', 'userInfo.studentNumber'])
        );

        return apiRender.renderPageResult(res, couponList, pagedCoupons.itemSize, pagedCoupons.pageSize, pagedCoupons.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 根据id获取优惠券基本信息
 *
 * @param req
 * @param res
 */
pub.fetchCouponItem = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return apiRender.renderBaseResult(res, _.pick(req.__CURRENT_COUPON_ITEM, ['id', 'money', 'status', 'expireDate', 'remark']));
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 更新优惠券信息
 *
 * @param req
 * @param res
 */
pub.updateCouponItem = (req, res) => {
  // 是否通知用户
  let isNotify = false;

  schemaValidator.validatePromise(couponSchema.updateCouponBodySchema, req.body)
      .then((couponItem) => {
        debug(couponItem);

        isNotify = couponItem.isNotify;

        delete couponItem.isNotify;
        couponItem.id = req.__CURRENT_COUPON_ITEM.id;

        return couponService.updateCoupon(couponItem);
      })
      .then((updatedCouponItem) => {
        debug(updatedCouponItem);

        if (isNotify === true) {
          //  通知用户
          userService.fetchById(req.__CURRENT_COUPON_ITEM.userId)
              .then((userItem) => {
                debug(userItem);

                wechatTemplateReply.sendCouponAlertMsg(userItem, '您有一张优惠券被修改了，点击查看');
              });
        }

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 移除优惠券
 *
 * @param req
 * @param res
 */
pub.deleteCouponItem = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return couponService.destroyCouponById(req.__CURRENT_COUPON_ITEM.id);
      })
      .then((couponItem) => {
        debug(couponItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
