'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const moment = require('moment');
const Promise = require('bluebird');
const winston = require('winston');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const withdrawSchema = require('./schema/withdraw.schema');

const apiUtil = require('../util/api.util');
const apiRender = require('../render/api.render');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const userWithdrawService = require('../../services/userWithdraw.service');
const userCoinService = require('../../services/userCoin.service');
const userPayService = require('../../services/userPay.service');

const wechatTransfer = require('../../lib/wechat.transfer');
const wechatTemplateReply = require('../../lib/wechat.template.reply');

/**
 * 执行微信退款，退款完成后更新退款记录
 *
 * @param userPayItem
 * @param withdrawItem
 * @param CURRENT_ADMIN_ID
 */
const wechatWithdrawUserWithdraw = (userPayItem, withdrawItem, CURRENT_ADMIN_ID) => {
  return wechatTransfer.withdraw(
      userPayItem.payInfo.signData.bookingNo,
      withdrawItem.verifiedMoney * 100,
      userPayItem.payInfo.signData.totalFee,
      CURRENT_ADMIN_ID,
      withdrawItem.refundAccount)
      .then((withdrawData) => {

        if (withdrawData.success !== true) {
          return Promise.reject(commonError.BIZ_FAIL_ERROR('微信账单退款失败'));
        }

        if (withdrawData.success === true) {
          userPayService.updateUserPay({
            id: userPayItem.id,
            status: enumModel.payStatusEnum.PAY_BACK_SUCCESS.key
          });
        }

        const withdrawInfo = {
          type: enumModel.withdrawTypeEnum.WECHAT_WITHDRAW.key,
          id: withdrawData.refundData.out_refund_no,
          userPayId: withdrawItem.userPayId,
          info: withdrawData
        };

        return userWithdrawService.updateWithdrawItem({
          id: withdrawItem.id,
          verifiedMoney: withdrawItem.verifiedMoney,
          verifiedRemark: withdrawItem.verifiedRemark,
          status: withdrawItem.status,
          verifiedDate: withdrawItem.verifiedDate,
          withdrawInfo: JSON.stringify(withdrawInfo)
        })
      });
};

/**
 * 同意用户退款请求的处理方法
 *
 * @param withdrawItem
 * @param CURRENT_USER_WITHDRAW_ITEM
 * @param CURRENT_USER_WITHDRAW_USER_ITEM
 * @param CURRENT_ADMIN_ID
 * @returns {Promise.<TResult>|Promise|*}
 */
const agreeUserWithdraw = (withdrawItem, CURRENT_USER_WITHDRAW_ITEM, CURRENT_USER_WITHDRAW_USER_ITEM, CURRENT_ADMIN_ID) => {
  let wechatUserWithdrawPromise;

  switch (withdrawItem.withdrawType) {
      // 企业转账
    case enumModel.withdrawTypeEnum.WECHAT_TRANSFER.key:
      return wechatTransfer
          .transferToUser(
              CURRENT_USER_WITHDRAW_USER_ITEM.openId,
              CURRENT_USER_WITHDRAW_ITEM.keyWord,
              withdrawItem.verifiedMoney * 100,
              `您于${ moment(CURRENT_USER_WITHDRAW_ITEM.applyDate).format('YYYY-MM-DD') }申请的${ Number(CURRENT_USER_WITHDRAW_ITEM.applyMoney).toFixed(2) }元提现操作现已审核通过,审核金额为${ Number(withdrawItem.verifiedMoney).toFixed(2) }元。`
          )
          .then((transferData) => {
            if (transferData.success !== true) {
              return Promise.reject(commonError.BIZ_FAIL_ERROR('微信企业转账退款失败！'));
            }

            const withdrawInfo = {
              type: enumModel.withdrawTypeEnum.WECHAT_TRANSFER.key,
              id: transferData.transferData.partner_trade_no,
              info: transferData
            };

            return userWithdrawService.updateWithdrawItem({
              id: withdrawItem.id,
              verifiedMoney: withdrawItem.verifiedMoney,
              verifiedRemark: withdrawItem.verifiedRemark,
              status: withdrawItem.status,
              verifiedDate: withdrawItem.verifiedDate,
              withdrawInfo: JSON.stringify(withdrawInfo)
            })
          });

      break;
      // 账单退款
    case enumModel.withdrawTypeEnum.WECHAT_WITHDRAW.key:
      return userPayService.fetchUserPayById(withdrawItem.userPayId)
          .then((userPayItem) => {
            debug(userPayItem);

            if (userPayItem.userId !== CURRENT_USER_WITHDRAW_USER_ITEM.id || userPayItem.status !== enumModel.payStatusEnum.PAY_SUCCESS.key) {
              return Promise.reject(commonError.PARAMETER_ERROR('付款记录id参数错误'));
            }

            return wechatWithdrawUserWithdraw(userPayItem, withdrawItem, CURRENT_ADMIN_ID);
          });
      break;
      // 手动退款，直接resolve
    case enumModel.withdrawTypeEnum.MANUAL_WITHDRAW.key:
      return userWithdrawService.updateWithdrawItem({
        id: withdrawItem.id,
        verifiedMoney: withdrawItem.verifiedMoney,
        verifiedRemark: withdrawItem.verifiedRemark,
        status: withdrawItem.status,
        verifiedDate: withdrawItem.verifiedDate
      });
      break;
      // 其它, 报错
    default:
      return Promise.reject(commonError.PARAMETER_ERROR('不支持的退款方式'));
      break;
  }
};

/**
 * 抽取优币中的关键信息
 *
 * @param userCoinItem
 */
const pickUserCoin = (userCoinItem) => ({
  userInfo: apiUtil.pickUserBasicInfo(userCoinItem.userInfo),
  score: userCoinItem.remark,
  withdrawMoney: userCoinItem.coinChange * 100,
  status: enumModel.withdrawStatusEnum.AGREED.key
});

/**
 * 班级退款详情信息过滤
 *
 * @param res
 * @param clazzWithdrawDetail
 * @returns {*}
 */
const renderClazzWithdrawDetail = (res, clazzWithdrawDetail) => {
  if (_.isEmpty(clazzWithdrawDetail.withdrawList)) {
    clazzWithdrawDetail.withdrawList = _.chain(clazzWithdrawDetail)
        .get(['userCoinList'], [])
        .map(pickUserCoin)
        .value();
  } else {
    // 遍历，过滤信息
    clazzWithdrawDetail.withdrawList = _.map(
        clazzWithdrawDetail.withdrawList,
        (withdrawItem) => ({
          userInfo: apiUtil.pickUserBasicInfo(withdrawItem.userInfo),
          score: withdrawItem.score,
          withdrawMoney: withdrawItem.withdrawMoney || (withdrawItem.applyMoney * 100),
          status: withdrawItem.status || enumModel.withdrawStatusEnum.WAITING.key
        })
    );
  }

  return apiRender.renderBaseResult(res, _.pick(clazzWithdrawDetail, ['id', 'totalWithdrawMoney', 'checkinRate', 'withdrawList']));
};

const pub = {};

/**
 * 分页查询退款列表
 *    包含用户基本信息
 *
 * @param req
 * @param res
 */
pub.queryPagedWithdrawList = (req, res) => {
  schemaValidator.validatePromise(withdrawSchema.withdrawQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return userWithdrawService.fetchPagedWithdraws(queryParam.pageNumber, queryParam.pageSize, queryParam.status, queryParam.applyDate, queryParam.searchType, queryParam.keyword);
      })
      .then((pagedWithdraws) => {
        debug(pagedWithdraws);

        // 抽取信息
        const withdrawList = _.map(
            pagedWithdraws.values,
            (coupon) => _.pick(
                coupon,
                ['id', 'applyMoney', 'status', 'payway', 'applyDate', 'userInfo.id', 'userInfo.headImgUrl', 'userInfo.name', 'userInfo.studentNumber']
            )
        );

        return apiRender.renderPageResult(res, withdrawList, pagedWithdraws.itemSize, pagedWithdraws.pageSize, pagedWithdraws.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询用户退款信息
 *
 * @param req
 * @param res
 */
pub.fetchWithdrawDetails = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const withdrawInfo = _.pick(req.__CURRENT_USER_WITHDRAW_ITEM, ['id', 'applyMoney', 'score', 'keyWord', 'payway', 'remark', 'status', 'verifiedMoney', 'verifiedRemark']),
            userPrivacy = _.pick(req.__CURRENT_USER_WITHDRAW_USER_ITEM, ['id', 'phoneNumber', 'wechat', 'alipay']);

        userPrivacy.payway = withdrawInfo.payway;
        withdrawInfo.userInfo = userPrivacy;

        return apiRender.renderBaseResult(res, withdrawInfo);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询退款结果
 *
 * @param req
 * @param res
 */
pub.requestWithdrawState = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const withdrawInfo = req.__CURRENT_USER_WITHDRAW_ITEM.withdrawInfo;

        if (_.isNil(withdrawInfo)) {
          return Promise.reject(commonError.PARAMETER_ERROR('尚未退款'));
        }

        switch (withdrawInfo.type) {
          case enumModel.withdrawTypeEnum.WECHAT_TRANSFER.key:
            return wechatTransfer.queryTransfer(withdrawInfo.id);
          case enumModel.withdrawTypeEnum.WECHAT_WITHDRAW.key:
            return wechatTransfer.queryWithdraw(withdrawInfo.id);
          default:
            return Promise.reject(commonError.PARAMETER_ERROR('不支持的退款方式'));
        }
      })
      .then((withdrawState) => {
        debug(withdrawState);

        return apiRender.renderBaseResult(res, withdrawState);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 处理微信退款
 *
 * @param req
 * @param res
 */
pub.handleUserWithdraw = (req, res) => {
  let isNotify = false,
      replyTitle = null,
      globalVerifiedMoney = 0;

  const globalWithdrawItemId = req.__CURRENT_USER_WITHDRAW_ITEM.id;

  schemaValidator.validatePromise(withdrawSchema.updateWithdrawBodySchema, req.body)
      .then((withdrawItem) => {
        debug(withdrawItem);

        globalVerifiedMoney = withdrawItem.verifiedMoney;

        req.__MODULE_LOGGER(`审核退款${ globalWithdrawItemId }`, withdrawItem);

        /* 如果
         1. 退款item的status不为WAITING
         2. 审核的退款金额大于用户所申请金额
         */
        if (req.__CURRENT_USER_WITHDRAW_ITEM.status !== enumModel.withdrawStatusEnum.WAITING.key ||
            req.__CURRENT_USER_WITHDRAW_ITEM.applyMoney < withdrawItem.verifiedMoney
        ) {
          return Promise.reject(commonError.PARAMETER_ERROR('退款已处理，或金额错误'));
        }

        isNotify = withdrawItem.isNotify;
        delete  withdrawItem.isNotify;

        withdrawItem.id = globalWithdrawItemId;
        withdrawItem.verifiedDate = new Date();

        switch (withdrawItem.status) {
          case enumModel.withdrawStatusEnum.REJECTED.key:
            replyTitle = '退款申请被拒绝';

            const updateWithdrawPromise = userWithdrawService.updateWithdrawItem(withdrawItem);
            const destroyUserCoinPromise = userCoinService.destroyUserCoinItemByBizId(globalWithdrawItemId);

            return Promise.all([updateWithdrawPromise, destroyUserCoinPromise]);
            break;
          case enumModel.withdrawStatusEnum.AGREED.key:
            replyTitle = '您申请的提现已受理，请在微信钱包或绑定银行卡进行查询。';

            return agreeUserWithdraw(withdrawItem, req.__CURRENT_USER_WITHDRAW_ITEM, req.__CURRENT_USER_WITHDRAW_USER_ITEM, req.__CURRENT_ADMIN.id);

            break;
          default:
            // 其他情况，参数错误
            return Promise.reject(commonError.PARAMETER_ERROR('不支持的退款状态'));
        }
      })
      .then((results) => {
        debug(results);

        if (isNotify === true) {
          wechatTemplateReply.sendPaybackMsg(req.__CURRENT_USER_WITHDRAW_USER_ITEM, replyTitle, '可进入微页面查看优币记录', globalVerifiedMoney);
        }

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询班级内所有周退款列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryClazzAllWeeklyWithdraws = (req, res) => {
  return schemaValidator.validatePromise(withdrawSchema.clazzWeeklyWithdrawListQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return userWithdrawService.queryPagedClazzWithdrawList(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedClazzWithdraws) => {
        debug(pagedClazzWithdraws);

        // 抽取信息
        const pickedClazzWithdrawList = _.map(
            pagedClazzWithdraws.values,
            (clazzWithdrawItem) => _.pick(
                clazzWithdrawItem,
                ['id', 'clazz', 'startDate', 'endDate', 'checkinRate', 'totalWithdrawMoney']
            )
        );

        return apiRender.renderPageResult(res, pickedClazzWithdrawList, pagedClazzWithdraws.itemSize, pagedClazzWithdraws.pageSize, pagedClazzWithdraws.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询班级周应退款详情
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.queryClazzWeeklyWithdraw = (req, res) => {
  return schemaValidator.validatePromise(withdrawSchema.clazzWeeklyWithdrawSchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        const queryStartDate = moment(queryParam.startDate).startOf('day').toDate(),
            queryEndDate = moment(queryParam.endDate).endOf('day').toDate(),
            checkinPrice = queryParam.checkinPrice,
            maxCheckinTimes = queryParam.maxCheckinTimes;

        const currentClazzId = req.__CURRENT_CLAZZ.id;
        // 查询所有班级退款记录
        return userWithdrawService.queryClazzWeeklyWithdrawDetails(
            currentClazzId,
            queryStartDate,
            queryEndDate,
            maxCheckinTimes,
            checkinPrice);
      })
      .then((clazzWithdrawDetail) => renderClazzWithdrawDetail(res, clazzWithdrawDetail))
      .catch(req.__ERROR_HANDLER);
};

/**
 * 执行班级周退款
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.withdrawClazzWeekly = (req, res) => {
  const currentClazzId = req.__CURRENT_CLAZZ.id;

  return schemaValidator.validatePromise(withdrawSchema.clazzWeeklyWithdrawSchema, req.body)
      .then((clazzWithdraw) => {
        debug(clazzWithdraw);
        const queryStartDate = moment(clazzWithdraw.startDate).startOf('day').toDate(),
            queryEndDate = moment(clazzWithdraw.endDate).endOf('day').toDate(),
            checkinPrice = clazzWithdraw.checkinPrice,
            maxCheckinTimes = clazzWithdraw.maxCheckinTimes;

        // 查询所有班级退款记录
        return userWithdrawService.queryClazzWeeklyWithdrawDetails(
            currentClazzId,
            queryStartDate,
            queryEndDate,
            maxCheckinTimes,
            checkinPrice)
            .then((clazzWithdrawDetail) => {
              // 首先创建对应的班级退款记录
              return userWithdrawService.createClazzWeeklyWithdrawItem({
                    clazz: currentClazzId,
                    startDate: queryStartDate,
                    endDate: queryEndDate,
                    checkinRate: clazzWithdrawDetail.checkinRate,
                    checkinNumber: _.size(clazzWithdrawDetail.checkinList),
                    totalWithdrawCount: _.size(clazzWithdrawDetail.withdrawList),
                    totalWithdrawMoney: clazzWithdrawDetail.totalWithdrawMoney
                  })
                  .then((clazzWithdrawItem) => {
                    // 返回新建的班级退款记录，及 退查询到的退款详情
                    return [clazzWithdrawItem, clazzWithdrawDetail];
                  })
            })
            .then(([clazzWithdrawItem, clazzWithdrawDetail]) => {

              // 用户退款详情记录
              const userWithdrawDetailList = clazzWithdrawDetail.withdrawList;

              debug(userWithdrawDetailList);

              const coinTitle = `${ req.__CURRENT_CLAZZ.name }退款`;
              const alertRemark = `您在${ req.__CURRENT_CLAZZ.name }的打卡退款已发放到优币账户，请关注您的打卡记录，核对退款金额是否正确`;

              // 新建用户优币记录
              const createUserCoinPromiseList = _.map(
                  userWithdrawDetailList,
                  (withdrawItem) => {
                    const userInfo = _.get(withdrawItem, ['userInfo']);
                    const coinChange = _.divide(withdrawItem.withdrawMoney, 100);

                    return userCoinService.createUserCoin({
                          coinChange: coinChange,
                          remark: `score: ${ withdrawItem.score }`,
                          title: coinTitle,
                          bizType: enumModel.coinBizTypeEnum.CLAZZEND.key,
                          bizId: _.get(userInfo, ['clazzAccount', 'id']),
                          userId: _.get(userInfo, ['id']),
                          changeDate: new Date()
                        })
                        .then((userCoinItem) => {

                          const coinChangeStr = coinChange >= 0
                              ? `+${ coinChange }`
                              : `-${ coinChange }`;
                          // 发送优币通知消息
                          wechatTemplateReply.sendGambicoinChangeMsg(userInfo, coinChangeStr, alertRemark, enumModel.coinBizTypeEnum.CLAZZEND.name)
                              .catch((error) => winston.error('推送班级退款消息给用户 %s 失败！error : %j', userInfo.id, error));

                          userCoinItem.userInfo = userInfo;

                          return userCoinItem;
                        });
                  }
              );

              return Promise.all(createUserCoinPromiseList)
                  .then((userCoinList) => {
                    debug(userCoinList);
                    const userCoinIdList = _.map(userCoinList, 'id');

                    return userWithdrawService.updateClazzWeeklyUserCoinRecords(clazzWithdrawItem.id, userCoinIdList)
                        .then((clazzWithdrawItem) => {
                          debug(clazzWithdrawItem);

                          return userCoinList;
                        });
                  });
            });
      })
      .then((userCoinList) => {
        const pickedUserCoinList = _.map(
            userCoinList,
            (userCoin) => ({
              isSuccess: true,
              error: null,
              userWithdraw: pickUserCoin(userCoin)
            })
        );

        return apiRender.renderBaseResult(res, pickedUserCoinList);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询退款详细信息--退款列表
 *
 * @param req
 * @param res
 * @returns {Promise|Promise.<T>}
 */
pub.fetchClazzWithdrawDetail = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return userWithdrawService.fetchClazzWithdrawItemById(req.params.withdrawId);
      })
      .then((clazzWithdrawItem) => {
        debug(clazzWithdrawItem);

        const clazzId = _.get(clazzWithdrawItem, 'clazz', null);

        if (req.__CURRENT_CLAZZ.id !== clazzId) {
          return Promise.reject(commonError.NOT_FOUND_ERROR());
        }

        const userCoinIdList = _.get(clazzWithdrawItem, ['userCoinRecords'], []);

        return _.isEmpty(userCoinIdList)
            ? userWithdrawService.queryUserWithdrawListByIds(_.get(clazzWithdrawItem, 'withdrawRecords', []))
                .then((userWithdrawList) => {
                  clazzWithdrawItem.withdrawList = userWithdrawList;

                  return clazzWithdrawItem;
                })
            : userCoinService.queryUserCoinListByIds(userCoinIdList)
                .then((userCoinList) => {
                  clazzWithdrawItem.userCoinList = userCoinList;

                  return clazzWithdrawItem;
                });
      })
      .then((clazzWithdrawItem) => renderClazzWithdrawDetail(res, clazzWithdrawItem))
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
