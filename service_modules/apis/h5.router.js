'use strict';

/**
 * h5 API 的路由
 */
const router = require('express').Router();

const bodyParser = require('body-parser');
const middleware = require('./h5.middleware');

/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
router.use(middleware.basicErrorHandler);

const commonController = require("./h5/common.controller");
router.get('/app', commonController.fetchAppVersion);

const accountApis = require('./h5/account.controller');

// 仅开发环境暴露
if (global.IS_DEVLOPMENT_ENVIRONMENT) {
  router.post('/user/auth', accountApis.auth);
}

// 七牛回调处理
const qiniuController = require('./h5/qiniu.controller');
router.post('/qiniu/callback', bodyParser.urlencoded({ extended: false }), qiniuController.qiniuCallbackHandler);

const wechatApi = require('./h5/wechat.api');
router.get('/wechat/auth', wechatApi.fetchWechatAuthUrl);
router.post('/wechat/auth', wechatApi.authWechatLogin);
router.get('/wechat/jsSdkAuth', wechatApi.signJsSdk);

// 课程任务相关API
const clazzTaskApis = require('./h5/clazzTask.controller');

// todo 移除旧router
router.get('/clazz/task/:taskId', clazzTaskApis.fetchClazzTaskItem);
router.get('/clazz/task/:taskId/replies', clazzTaskApis.fetchReplies);
router.get('/clazz/:clazzId/task/:taskId', middleware.preloadClazzItem, clazzTaskApis.fetchClazzTaskItem);
router.get('/clazz/:clazzId/task/:taskId/replies', clazzTaskApis.fetchReplies);

/***********************************************************************************************************************
 * 微信事件接口
 ***********************************************************************************************************************/

const commonMiddleware = require('./common.middleware');
router.get('/wechat', wechatApi.wechatEventRegister);
router.post('/wechat', commonMiddleware.wechatXmlParser, wechatApi.wechatMsgHandler);
router.post('/wechat/pay', commonMiddleware.wechatXmlParser, wechatApi.wechatPaymentCallbackHandler);

const promotionController = require('./h5/promotion.controller');
router.get('/promotion/promoter/:promoterUserId', promotionController.fetchPromotionUserInfoByUserId);
router.get('/account/targets', accountApis.getUserStudyTarget);



/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(middleware.parseAuthToken);

/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(middleware.moduleLogger);

// 用户更新token
// router.put('/auth', accountApis.refreshAuthToken);

// 用户相关
router.get('/account', accountApis.getUserBaseInfo);
router.put('/account', accountApis.updateUserBaseInfo);
router.get('/account/privacy', accountApis.fetchUserPrivacy);
router.put('/account/privacy', accountApis.updateUserPrivacy);
router.get('/account/password', accountApis.checkPasswordExist);
router.post('/account/password', accountApis.initialPassword);
router.put('/account/password', accountApis.updatePassword);
router.get('/account/coins', accountApis.fetchCoins);
router.get('/account/coinSum', accountApis.calculateUserCoinSum);
router.get('/account/coupons', accountApis.fetchCouponList);
router.get('/account/coupon/:couponId', accountApis.fetchCoupon);
router.get('/account/withdraws', accountApis.queryUserWithdraws);
router.post('/account/withdraw', accountApis.userWithdraw);
router.get('/account/withdraw/:withdrawId', accountApis.getUserWithdraw);
router.delete('/account/withdraw/:withdrawId', accountApis.userCancelWithdraw);
router.get('/account/rank', accountApis.queryUserRank);
router.get('/account/card', accountApis.queryUserCards);

// 用户目标设定
router.post('/account/target', accountApis.updateUserTarget);

// 报名相关API
// 课程相关API
const clazzApis = require('./h5/clazz.controller');

router.get('/clazzes', clazzApis.queryClazzList);
router.get('/advs', clazzApis.queryAdvList);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CLAZZ
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', middleware.preloadClazzItem);

router.get('/clazz/:clazzId', clazzApis.fetchClazz);
router.get('/clazz/:clazzId/introduction', middleware.preloadClazzIntroductionItem, clazzApis.fetchClazzIntroduction);
router.get('/clazz/:clazzId/payway', middleware.preloadClazzIntroductionItem, clazzApis.fetchClazzPayway);
router.get('/clazz/:clazzId/payment', clazzApis.fetchClazzPayment);
router.post('/clazz/:clazzId/payment', clazzApis.preProcessClazzPayment);

// 根据推广码获取班级优惠详情
router.get('/clazz/:clazzId/promotion/offer', promotionController.fetchPromotionOfferInfoByKey);

/***********************************************************************************************************************
 * 检查用户是否已经加入课程, 并定义__IS_CURRENT_CLAZZ_TEACHER表示当前用户是否为课程笃师
 * 之后的接口都要求用户已经加入了课程，否则报401, 权限不足
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', middleware.checkHasJoinClass);

router.delete('/clazz/:clazzId', clazzApis.userQuitClazz);
router.get('/clazz/:clazzId/strategy', middleware.preloadClazzIntroductionItem, clazzApis.fetchClazzStrategy);
router.get('/clazz/:clazzId/isTeacher', clazzApis.checkIsTeacher);

router.get('/clazz/:clazzId/tasks', clazzTaskApis.queryClazzTaskList);
router.post('/clazz/:clazzId/task/:taskId/reply', clazzTaskApis.createTaskReply);
router.post('/clazz/:clazzId/task/:taskId/share', clazzTaskApis.createTaskShare);
router.get('/clazz/:clazzId/taskShare', clazzTaskApis.queryUserTaskShare);


// 打卡相关API
const checkinApis = require('./h5/checkin.controller');
router.get('/clazz/:clazzId/checkins', middleware.markCanCheckin, checkinApis.queryCheckinList);
router.get('/clazz/:clazzId/checkin', middleware.markCanCheckin, checkinApis.queryCheckinStatus);
router.post('/clazz/:clazzId/checkin', middleware.markCanCheckin, checkinApis.createClazzCheckin);
router.get('/clazz/:clazzId/checkin/sum', checkinApis.getCheckinSumdata);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CHECKIN
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/checkin/:checkinId', middleware.preloadCheckinItem);

router.get('/clazz/:clazzId/checkin/:checkinId', checkinApis.fetchCheckinItem);
router.put('/clazz/:clazzId/checkin/:checkinId', checkinApis.updateCheckinItem);
router.delete('/clazz/:clazzId/checkin/:checkinId', checkinApis.deleteCheckin);

// 笃师一对一API
const clazzFeedbackApis = require('./h5/clazzFeedback.controller');
router.get('/clazz/:clazzId/feedbacks', middleware.checkIsFeedbackAvailable, middleware.mustBeClazzTeacher, clazzFeedbackApis.listFeedbacks);
router.get('/clazz/:clazzId/feedback/materials', middleware.checkIsFeedbackAvailable, middleware.mustBeClazzTeacher, clazzFeedbackApis.listFeedbackMaterials);
router.get('/clazz/:clazzId/feedback/material/:materialId', middleware.checkIsFeedbackAvailable, clazzFeedbackApis.fetchFeedbackMaterial);
router.get('/clazz/:clazzId/feedback', middleware.checkIsFeedbackAvailable, middleware.preloadFeedbackItem, clazzFeedbackApis.listFeedbackReplys);
router.post('/clazz/:clazzId/feedback', middleware.checkIsFeedbackAvailable, middleware.preloadFeedbackItem, clazzFeedbackApis.replyFeedback);
router.get('/clazz/:clazzId/feedback/:feedbackId', middleware.checkIsFeedbackAvailable, middleware.mustBeClazzTeacher, middleware.preloadFeedbackItem, clazzFeedbackApis.listFeedbackReplys);
router.post('/clazz/:clazzId/feedback/:feedbackId', middleware.checkIsFeedbackAvailable, middleware.mustBeClazzTeacher, middleware.preloadFeedbackItem, clazzFeedbackApis.replyFeedback);


// 排行榜
const clazzRankApis = require('./h5/clazzRank.controller');
router.get('/clazz/:clazzId/ranks', clazzRankApis.queryPagedClazzRank);
router.get('/clazz/:clazzId/rank', clazzRankApis.fetchCurrentUserClazzRank);
router.post('/clazz/:clazzId/rank/:rankId/favour', clazzRankApis.favourClazzRank);

// 七牛
router.post('/qiniu', qiniuController.fetchQiniuUploadToken);

const clazzActivityController = require('./h5/clazzActivity.controller');
// 推广活动
router.get('/activity', clazzActivityController.getActivityIdByType);
// morning call活动
router.get('/activities', clazzActivityController.queryAllActivities);

/***********************************************************************************************************************
 * 定义 req.__CURRENT_CLAZZ_ACTIVITY
 * 定义 req.__CURRENT_CLAZZ_ACCOUNT_ACTIVITY
 * 定义 req.__CURRENT_ACTIVITY_ACCOUNT
 **********************************************************************************************************************/
router.use('/activity/:activityId', middleware.preloadClazzActivityItem);

// 推广活动
router.get('/activity/:activityId', middleware.mustBeShowedClazzActivity, clazzActivityController.fetchActivityDetail);

// morning call活动
router.get('/activity/:activityId/account', clazzActivityController.fetchActivityAccountItem);
router.post('/activity/:activityId/account', middleware.userJoinActivity, clazzActivityController.createActivityAccountItem);

// 推广活动
router.use('/activity/:activityId/user', middleware.mustBeShowedClazzActivity);
router.post('/activity/:activityId/user', clazzActivityController.userJoinActivityItem);

router.use('/activity/:activityId/user/:userId', middleware.preloadTargetUserClazzActivityAccountItem);
router.get('/activity/:activityId/user/:userId', clazzActivityController.fetchActivityJoinStatus);
router.post('/activity/:activityId/user/:userId/favour', clazzActivityController.favourActivityAccount);

// morning call活动
router.use('/activity/:activityId', middleware.mustActivityAccountProcessing);

router.get('/activity/:activityId/room', clazzActivityController.fetchActivityRoomInfo);
router.delete('/activity/:activityId/room', clazzActivityController.dismissActivityRoom);
router.get('/activity/:activityId/room/statistics', clazzActivityController.queryActivityRoomStatistic);

router.get('/promotions', promotionController.fetchSamplePromotionUserList);
router.get('/promotion', promotionController.fetchPromotionInfo);
router.post('/promotion', promotionController.joinPromotionUser);

router.use('/promotion', middleware.userMustJoinPromotion);
router.get('/promotion/invitees', promotionController.fetchUserGroupedPromotionIncomeList);
router.get('/promotion/invitee/:inviteeUserId', promotionController.fetchInviteePromotionIncome);
router.get('/promotion/incomes', promotionController.fetchPromotionIncomeList);
router.put('/promotion/income', promotionController.withdrawPromotionIncome);

const clazzTeacherController = require('./h5/clazzTeacher.controller');
router.get('/clazzTeachers', clazzTeacherController.fetchPagedTeacherList);

/***********************************************************************************************************************
 * 定义 req.__CURRENT_CLAZZ_TEACHER_ITEM
 **********************************************************************************************************************/
router.use('/clazzTeacher/:clazzTeacherId', middleware.preloadClazzTeacherItem);

router.get('/clazzTeacher/:clazzTeacherId', clazzTeacherController.fetchTeacherItem);
router.get('/clazzTeacher/:clazzTeacherId/meatySharings', clazzTeacherController.fetchPagedTeacherMeatySharingList);
router.get('/clazzTeacher/:clazzTeacherId/commends', clazzTeacherController.fetchPagedTeacherCommendList);
router.get('/clazzTeacher/:clazzTeacherId/clazzes', clazzTeacherController.fetchClazzTeacherClazzList);

router.post('/clazzTeacher/:clazzTeacherId/follower', clazzTeacherController.followClazzTeacher);

const guideController = require('./h5/guide.controller');

router.get('/guide/chats', guideController.fetchInteractiveChatList);

router.post('/clazzExit', clazzApis.createClazzExitItem);
router.get('/clazzExit/list', clazzApis.getUserClazzExits);
router.get('/clazzExit/:exitId', clazzApis.getClazzExistById);
router.delete('/clazzExit/:clazzId', clazzApis.removeClazzExitById);


//导出module
module.exports = router;
