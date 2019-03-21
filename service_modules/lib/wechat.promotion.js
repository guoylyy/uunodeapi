'use strict';

const _ = require('lodash');
const debug = require('debug')('lib');
const winston = require('winston');
const moment = require('moment');
const request = require('request');
const Promise = require('bluebird');

const systemConfig = require('../../config/config');

const wechatAuth = require('./wechat.auth');
const wechatCustomMessage = require('./wechat.custom.message');
const wechatTemplateMessage = require('./wechat.template.message');
const wechatTemplateReply = require('./wechat.template.reply');

const userService = require('../services/user.service');
const promotionService = require('../services/promotion.service');
const couponService = require('../services/coupon.service');

const enumModel = require('../services/model/enum');
const commonError = require('../services/model/common.error');

const compiledCreateQrcodeUrlTemplate = _.template('https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${ token }');
/**
 * 获取生成带参数的二维码的url地址
 * @param token   网页授权接口调用凭证
 * @returns {*}
 */
const getCreateQrcodeUrl = (token) => {
  return compiledCreateQrcodeUrlTemplate({
    token: token
  })
};

const compiledShowQrcodeUrlTemplate = _.template('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${ ticket }');

const pub = {};

/**
 * 新建 永久二维码
 * @param userId
 */
pub.createWechatQrcode = (userId) => {
  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        const createQrcodeUrl = getCreateQrcodeUrl(accessToken);

        const bodyJson = {
          "action_name": "QR_LIMIT_STR_SCENE",
          "action_info": {
            "scene": { "scene_str": `${ userId }` }
          }
        };

        return new Promise((resolve, reject) => {
          request(
              {
                url: createQrcodeUrl,
                method: 'POST',
                body: JSON.stringify(bodyJson)
              },
              (err, response, body) => {
                debug(err);
                debug(body);

                if (!_.isNil(err)) {
                  winston.error('[create_qrcode_fail], error: %j', err);
                  return reject(err);
                }

                debug('[create_qrcode_success], body: %j', body);
                const qrCodeInfo = JSON.parse(body);

                if (!_.isNil(qrCodeInfo.errcode)) {
                  winston.error(qrCodeInfo);
                  return reject(commonError.BIZ_FAIL_ERROR());
                }

                return resolve(qrCodeInfo);
              });
        });
      });
};

/**
 *
 * @param ticket
 * @returns {*}
 */
pub.getWechatQrCodeUrlByTicket = (ticket) => {
  return compiledShowQrcodeUrlTemplate({
    ticket: ticket
  })
};

/**
 * 推广注册事件处理
 *
 * @param inviteeUserItem
 * @param eventKey
 * @param ticket
 * @returns {Promise.<TResult>|Promise}
 */
pub.promotionRegisterHandler = (inviteeUserItem, eventKey, ticket) => {
  debug(inviteeUserItem);
  debug(eventKey);
  debug(ticket);

  const inviteeUserId = inviteeUserItem.id;

  winston.info('[推广注册事件处理]，inviteeUserId: %s, eventKey: %s, ticket: %s', inviteeUserId, eventKey, ticket);

  // EventKey	事件KEY值，qrscene_为前缀，后面为二维码的参数值
  const promoterUserItemId = eventKey.substr(8);

  // 01. 构建查询项目
  const fetchPromotionUserPromise = promotionService.fetchPromotionUserByUserId(promoterUserItemId);
  const fetchUserItemPromise = userService.fetchById(promoterUserItemId);
  const fetchInviteeUserItemPromise = userService.fetchById(inviteeUserId);
  const fetchPromotionRelationPromise = promotionService.fetchPromotionRelation(promoterUserItemId, inviteeUserId);

  // 02. 同时查询
  return Promise.all([fetchPromotionUserPromise, fetchUserItemPromise, fetchInviteeUserItemPromise, fetchPromotionRelationPromise])
      .then(([promotionUser, promotionUserInfo, inviteeUserInfo, promotionRelation]) => {
        debug(promotionUser);
        debug(promotionUserInfo);
        // 03. 参数检查工作
        if (!_.isNil(promotionRelation)) {
          winston.error('[推广注册事件处理失败_已关联的推广关系]，推广者: %s， 被邀者: %s', promoterUserItemId, inviteeUserId);
          return false;
        }

        if (_.isNil(promotionUser) || _.isNil(promotionUserInfo)) {
          winston.error('[推广注册事件处理失败_不存在的推广者]，推广者: %s', promoterUserItemId);
          return false;
        }

        if(!_.isNil(inviteeUserInfo) || !_.isNil(inviteeUserInfo.studentNumber)){
          winston.error('[推广注册事件处理失败_被推广者是老用户]，被推广者: %s', inviteeUserInfo);
          return false;
        }

        const qrcodeTicket = _.get(promotionUser, ['qrcode', 'ticket'], '');
        debug(qrcodeTicket);
        if (qrcodeTicket !== ticket) {
          // 不相同的处理
          winston.error('[推广注册事件失败_ticket错误]，ticket: %s, qrcodeTicket: %s', ticket, qrcodeTicket);
          return false;
        }
        // 推广发优惠券
        let couponExpiredDate = (new moment()).add(1,'months').toDate();
        let couponMoney = 10;
        // 04. 给构建推广者的优惠券
        couponService.createUserCoupon(promoterUserItemId, couponExpiredDate, couponMoney).then((resultItem) =>{
          //TODO:需要检测被邀请者是不是已经注册了，如果不是新注册的学员，就不能获得优惠券.

          //加入了推广者的优惠券
          winston.info('[推广优惠券发放] %s 获得了推广优惠券 %d 元', promoterUserItemId, couponMoney);
          return resultItem;
        }).then((couponResult)=>{
          // 05. 构建非推广者的优惠券 & 写入推广关系
          return promotionService.createPromotionRelation(
              promotionUser.id,
              promotionUserInfo.id,
              inviteeUserId,
              enumModel.promotionTypeEnum.REGISTRATION_INVITATION.key
          )
              .then((createdPromotionRelation) => {
                debug(createdPromotionRelation);

                const inviteeUserName = inviteeUserItem.name,
                    promoterUsername = promotionUserInfo.name;
                // 构造友军模板消息
                const inviteePromotionAlert = wechatTemplateMessage.PROMOTION_REGISTER_ALERT(
                    inviteeUserItem.openId,
                    `${ systemConfig.BASE_URL }/redirect?target=/me/index`,
                    `你已经被 ${ promoterUsername } 邀请成功了！\n 友班赠送你10元优惠券，快和好友一起报班学习吧～\n`,
                    inviteeUserName,
                    '\n快去用优惠券报名吧\n点击个人中心，加入伙伴中心\n惊喜多多哦！'
                );

                //发放被推广者的优惠券
                couponService.createUserCoupon(inviteeUserId, couponExpiredDate, couponMoney).then((resultItem)=>{
                  winston.info('[被推广优惠券发放] %s 获得了推广优惠券 %d 元', inviteeUserId, couponMoney);
                });

                // 构造友军模板消息
                const promoterPromotionAlert = wechatTemplateMessage.PROMOTION_REGISTER_ALERT(
                    promotionUserInfo.openId,
                    `${ systemConfig.BASE_URL }/redirect?target=/me/index`,
                    `${inviteeUserName}已经成功被你邀请！\n\n赠送你10元优惠券，感谢你推荐了这么好的同学！\n`,
                    inviteeUserName,
                    '\n获取更多优惠券，多多帮忙推荐哦！\n'
                );

                // 06. 推送消息给双方用户
                wechatTemplateReply.pushTemplateMessageList([inviteePromotionAlert, promoterPromotionAlert]);

                winston.info('[推广注册事件处理成功]，promoterUserId: %s, inviteeUserId: %s', promoterUserItemId, inviteeUserId);
                return true;
              });
        });
      });
};

/**
 * 推广付款成功后后续处理
 *
 * @param promotionCode
 * @param inviteeUserItem
 * @param clazzItem
 * @param userPayItem
 * @returns {*}
 */
pub.promotionClazzPaymentHandler = (promotionCode, inviteeUserItem, clazzItem, userPayItem) => {
  debug(promotionCode);
  debug(inviteeUserItem);
  debug(clazzItem);
  debug(userPayItem);

  winston.info(
      '[推广购买事件处理]，promotionCode: %s, inviteeUserItem: %j, clazzItem: %j, userPayItem: %j',
      promotionCode,
      inviteeUserItem,
      clazzItem,
      userPayItem
  );

  // 参数检查
  if (!_.isString(promotionCode) || _.isNil(inviteeUserItem) || _.isNil(clazzItem)) {
    winston.error(
        '[推广购买事件处理失败]，promotionCode: %s, inviteeUserItem: %j, clazzItem: %j, userPayItem: %j',
        promotionCode,
        inviteeUserItem,
        clazzItem,
        userPayItem
    );

    return Promise.resolve(false);
  }

  // 根据推广码获取推广用户信息
  return promotionService.fetchPromotionUserByPromotionCode(promotionCode)
      .then((promotionUser) => {
        const promotionUserInfo = promotionUser.userInfo;

        if (_.isNil(promotionUser)) {
          winston.error('[推广购买事件处理失败]，不存在的优惠码: %s', promotionCode);

          return false;
        }

        debug(promotionUserInfo);
        if (_.isNil(promotionUserInfo)) {
          winston.error('[推广购买事件处理失败]，不存在的邀请者');

          return false;
        }

        // todo 增加模板消息推送模板消息

        const promoterUserItemId = promotionUserInfo.id,
            inviteeUserId = inviteeUserItem.id;

        // 如果为推广用户本身，则忽略之
        if (promoterUserItemId === inviteeUserId) {
          winston.error('[推广购买事件处理失败]，购买者为推广者本人');

          return false;
        }

        // 如果不存在推广关系，则新建首单推广关联
        const createPromotionRelationPromise = promotionService.fetchPromotionRelation(promoterUserItemId, inviteeUserId)
            .then((promotionRelation) => {
              debug(promotionRelation);

              if (_.isNil(promotionRelation)) {
                return promotionService.createPromotionRelation(
                    promotionUser.id,
                    promoterUserItemId,
                    inviteeUserId,
                    enumModel.promotionTypeEnum.FIRST_OFFER.key
                );
              }

              return promotionRelation;
            });

        const promotionIncomeItem = {
          promoterUserId: promoterUserItemId,
          inviteeUserId: inviteeUserId,
          clazzId: clazzItem.id,
          status: enumModel.promotionIncomeStatusEnum.RESERVED.key,
          inviteeUserBenefit: _.get(clazzItem, ['configuration', 'promotionOffer', 'firstOffer'], 0),
          promoterUserIncome: _.get(clazzItem, ['configuration', 'promotionOffer', 'promotionIncome'], 0)
        };
        // 如果账单存在，则添加userPayId
        const userPayId = _.get(userPayItem, 'id', null);
        if (!_.isNil(userPayId)) {
          promotionIncomeItem.userPayId = userPayId;
        }

        // 推广收益处理
        const createPromotionIncomePromise = promotionService.createPromotionIncome(promotionIncomeItem);

        return Promise.all([createPromotionRelationPromise, createPromotionIncomePromise])
            .then(([promotionRelation, promotionIncome]) => {
              debug(promotionRelation);
              debug(promotionIncome);

              // 构造消息
              const promotionIncomeAlert = wechatTemplateMessage.PROMOTION_INCOME_ALERT(
                  promotionUserInfo.openId,
                  `${ systemConfig.BASE_URL }/redirect?target=/promotion/invitee/${ inviteeUserId }`,
                  '有名友军使用了你的首单优惠码报名课程，为你带来了收益！',
                  clazzItem.name,
                  inviteeUserItem.name,
                  '赶快去看看吧～'
              );
              // 推送消息
              wechatTemplateReply.pushTemplateMessage(promotionIncomeAlert, true, clazzItem.id, promotionUserInfo.id);

              return true;
            });
      });
};

/**
 * 学员退班处理
 *
 * @param inviteeUserId
 * @param promotionClazz
 */
pub.cancelPromotionIncomeHandler = (inviteeUserId, promotionClazz) => {
  return promotionService.fetchPromotionIncomesByClazzId(inviteeUserId, promotionClazz.id)
      .then((promotionIncomeList) => {
        const updateIncomePromiseList = _.map(promotionIncomeList, (incomeItem) => {
          return promotionService.updatePromotionIncomeById({
            id: incomeItem.id,
            status: enumModel.promotionIncomeStatusEnum.CANCELED.key
          });
        });

        return Promise.all(updateIncomePromiseList)
            .then((updatedIncomeList) => {
              debug(updatedIncomeList);
              // 通知收益飞走了
              const promoterUserIdList = _.map(promotionIncomeList, 'promoterUserId');

              const fetchPromoterUserPromiseList = userService.queryUser(null, promoterUserIdList);
              const fetchInviteePromiseList = userService.fetchById(inviteeUserId);

              Promise.all([fetchInviteePromiseList, fetchPromoterUserPromiseList])
                  .then(([inviteeUserItem, promoterUserList]) => {
                    // 构造消息列表
                    const promotionIncomeAlertList = _.map(promoterUserList, (promoterUserItem) => wechatTemplateMessage.PROMOTION_INCOME_ALERT(
                        promoterUserItem.openId,
                        `${ systemConfig.BASE_URL }/redirect?target=/promotion/invitee/${ inviteeUserId }`,
                        `啊哦，你的友军${ inviteeUserItem.name }已退班\n在路上的收益遗憾的飞走了`,
                        promotionClazz.name,
                        inviteeUserItem.name,
                        '点击进入个人中心-伙伴中心\n查看友军详情。\n友班常在，课程常新，\n下次再和友军一起学习吧！'
                    ));

                    // 推送消息列表
                    wechatTemplateReply.pushTemplateMessageList(promotionIncomeAlertList);
                  });

              return updatedIncomeList;
            });
      });
};

module.exports = pub;
