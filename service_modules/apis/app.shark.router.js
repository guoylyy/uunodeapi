'use strict';

/**
 * shark app API 的路由
 */
const _ = require('lodash');
const router = require('express').Router();
const bodyParser = require('body-parser');

const systemConfig = require('../../config/config');

const middleware = require('./app.shark.middleware');
const h5MiddleWare = require('./h5.middleware');
const commonMiddleware = require('./common.middleware');

/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
router.use(middleware.basicErrorHandler);

const accountApis = require('./app.shark/account.controller');

// 仅开发环境暴露
if (global.IS_DEVLOPMENT_ENVIRONMENT) {
  router.post('/account/auth', accountApis.auth);
}

const accountLoginApi = require('./app.shark/account.login.api');
router.post('/wechat/auth', accountLoginApi.authWechatLogin); //微信登录
router.post('/phoneNumber/auth', accountLoginApi.authPhonenumberLogin); //手机号登录

// const paymentCallback = require('./app.shark/payment.callback.controller');
// router.post('/wechat/payCallback', commonMiddleware.wechatXmlParser, paymentCallback.wechatPaymentCallbackHandler);
// router.post('/alipay/callback', bodyParser.urlencoded({ extended: false }), paymentCallback.alipayPaymentHandler);

const qiniuApis = require('./app.shark/qiniu.controller');
router.post('/qiniu/callback', bodyParser.urlencoded({ extended: false }), qiniuApis.qiniuCallbackHandler);

const basicApis = require('./app.shark/basic.controller');
router.get('/version', basicApis.fetchAppVersion);
router.get('/system', basicApis.fetchIsAudit);

const accountRegisterApi = require('./app.shark/account.register.controller');
// router.post('/account/phoneNumber/sms', accountRegisterApi.sendRegisterCode);
// router.put('/account/phoneNumber/sms', accountRegisterApi.checkRegisterCode);
// router.post('/account/phoneNumber', accountRegisterApi.initAccountByPhonenumber);

// router.post('/account/password/sms', accountRegisterApi.sendResetPasswordCode);
// router.put('/account/password/sms', accountRegisterApi.checkRestPasswordCode);
// router.put('/account/password', accountRegisterApi.resetAccountPassword);

// 获取用户单词本的接口



/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(middleware.parseAuthToken);

/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(middleware.moduleLogger);

/***********************************************************************************************************************
 * 自动生成学号
 * 默认加入介绍班
 ***********************************************************************************************************************/
if (_.get(systemConfig, ['APP_RELEASE_CONFIG', 'isAudit'], true) === true) {
  router.use(middleware.autoGenerateStudentNumber);
  // router.use(middleware.autoJoinIntroductionClazzItem);
}

// 用户相关
router.get('/account', accountApis.getUserBaseInfo);
router.put('/account', accountApis.updateUserInfo);
router.get('/account/auth', accountApis.checkAuth);
router.delete('/account/auth', accountApis.checkAuth); //TODO:登出方法

const h5AccountApis = require('./h5/account.controller');

router.get('/account/privacy', accountApis.fetchUserPrivacy);
router.put('/account/privacy', accountApis.updateUserPrivacy);

router.post('/account/privacy/phoneNumber/sms', accountRegisterApi.sendPrivacyPhonenumberRegisterCode);
router.put('/account/privacy/phoneNumber/sms', accountRegisterApi.checkPrivacyPhonenumberRegisterCode);
router.put('/account/privacy/phoneNumber', accountRegisterApi.connectAccountPrivacyPhonenumber);

router.get('/account/privacy/wechat', accountRegisterApi.fetchAccountPrivacyWechat);
router.put('/account/privacy/wechat', accountRegisterApi.connectAccountPrivacyWechat);

router.get('/account/coins', h5AccountApis.fetchCoins);
router.get('/account/coupons', accountApis.fetchCouponList);

const ubandCoinApis = require('./app.shark/ubandCoin.controller');
router.get('/account/ubandCoin/products', ubandCoinApis.queryAvailableIapProducts);
router.post('/account/ubandCoin/redeem', ubandCoinApis.redeemUbandCoin);
router.get('/account/ubandCoin', ubandCoinApis.queryUbandCoins);
router.post('/account/ubandCoin', ubandCoinApis.paidIapProduct);
router.delete('/account/ubandCoin', ubandCoinApis.paidClazzItem);

const clazzApis = require('./app.shark/clazz.controller');
const checkinApis = require('./app.shark/clazzCheckin.controller');

router.get('/advertise/banners', clazzApis.getAppActiveBanner);
router.get('/advertise/hostClazzes', clazzApis.getHotClazzList);

//获取课程的列表
// @如果是开放的课程需要加入的人数
// @如果是非开放的课程，不用计算
router.get('/clazzes', clazzApis.queryClazzList);
router.get('/clazzes/checkin_days', checkinApis.getUserCheckinDays);
/***********************************************************************************************************************
 * 定义req.__CURRENT_CLAZZ
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', h5MiddleWare.preloadClazzItem);

router.get('/clazz/:clazzId/introduction', h5MiddleWare.preloadClazzIntroductionItem, clazzApis.fetchClazzIntroduction);
router.get('/clazz/:clazzId/payment', clazzApis.fetchClazzPayment);
router.post('/clazz/:clazzId/payment', clazzApis.preProcessClazzPayment);

/***********************************************************************************************************************
 * 检查用户是否已经加入课程, 并定义__IS_CURRENT_CLAZZ_TEACHER表示当前用户是否为课程笃师
 * 之后的接口都要求用户已经加入了课程，否则报401, 权限不足
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', h5MiddleWare.checkHasJoinClass);

// 课程任务相关API
const clazzTaskApis = require('./app.shark/clazzTask.controller');
router.get('/clazz/:clazzId/tasks', clazzTaskApis.queryClazzTaskList);
router.get('/clazz/:clazzId/task/:taskId', clazzTaskApis.fetchClazzTaskItem);

// 打卡相关API
router.get('/clazz/:clazzId/own_checkins', h5MiddleWare.markCanCheckin, checkinApis.queryCheckinList);
router.get('/clazz/:clazzId/checkins', checkinApis.queryClazzCheckins);
router.get('/clazz/:clazzId/checkins/trend', checkinApis.queryCheckinTrend);

router.get('/clazz/:clazzId/luckyCheckins', checkinApis.fetchClazzLuckyCheckins);

router.use('/clazz/:clazzId/feedback', h5MiddleWare.preloadFeedbackItem);
// 课程点评API
const clazzFeedbackApis = require('./h5/clazzFeedback.controller');
router.get('/clazz/:clazzId/feedback/material/:materialId', clazzFeedbackApis.fetchFeedbackMaterial);
router.get('/clazz/:clazzId/feedback', clazzFeedbackApis.listFeedbackReplys);
router.post('/clazz/:clazzId/feedback', clazzFeedbackApis.replyFeedback);

// 排行榜
const clazzRankApis = require('./h5/clazzRank.controller');
router.get('/clazz/:clazzId/ranks', clazzRankApis.queryPagedClazzRank);
router.get('/clazz/:clazzId/rank', clazzRankApis.fetchCurrentUserClazzRank);
router.post('/clazz/:clazzId/rank/:rankId/favour', clazzRankApis.favourClazzRank);

// 七牛文件上传
router.post('/qiniu', qiniuApis.fetchQiniuUploadToken);

const h5CheckinApis = require('./h5/checkin.controller');
router.get('/clazz/:clazzId/luckyCheckin/:luckyCheckinId/checkin/:checkinId', middleware.preloadLuckyCheckinItem, checkinApis.fetchClazzLuckyCheckinItem);

router.get('/clazz/:clazzId/checkin', h5MiddleWare.markCanCheckin, h5CheckinApis.queryCheckinStatus);
router.post('/clazz/:clazzId/checkin', h5MiddleWare.markCanCheckin, h5CheckinApis.createClazzCheckin);
router.get('/clazz/:clazzId/checkin/sum', checkinApis.getCheckinSumdata);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CHECKIN
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/checkin/:checkinId', h5MiddleWare.preloadCheckinItem);

router.get('/clazz/:clazzId/checkin/:checkinId', h5CheckinApis.fetchCheckinItem);
router.put('/clazz/:clazzId/checkin/:checkinId', h5CheckinApis.updateCheckinItem);
router.delete('/clazz/:clazzId/checkin/:checkinId', h5CheckinApis.deleteCheckin);

const clazzPlayApis = require('./app.shark/clazzRolePlay.controller');
router.get('/clazz/:clazzId/plays', clazzPlayApis.queryClazzPlayList);
router.get('/clazz/:clazzId/play/:playId', clazzPlayApis.fetchClazzPlayItem);

module.exports = router;
