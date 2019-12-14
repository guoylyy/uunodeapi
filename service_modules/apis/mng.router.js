'use strict';
/**
 * MNG API 的路由
 *  * 友班大管理系统的配置
 *  * @Date 2019-07-31 超级管理员、助教、教师系统融为一体
 */

const router = require('express').Router();
const middleware = require('./mng.middleware');
const bodyParser = require('body-parser');
router.use(middleware.basicErrorHandler);

//管理员登录接口
const adminController = require('./mng/admin.controller');
router.post('/auth', adminController.auth);

const qiniuController = require('./mng/qiniu.controller');
router.post('/qiniu/callback', bodyParser.urlencoded({ extended: false }), qiniuController.qiniuCallbackHandler);

/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(middleware.parseAuthToken);
// 检查token是否有效
router.get('/auth', adminController.checkAuth);

/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(middleware.moduleLogger);

router.put('/account/password', adminController.updateAdminPassword);
router.delete('/auth', adminController.deAuth);

const clazzController = require('./mng/clazz.controller');
router.get('/clazzes', clazzController.fetchClazzList);


/***********************************************************************************************************************
 * 提供给友班教师使用的相关功能
 * 	- 招生统计
 * 	- 财务统计
 * 	- 报销提交（教师）
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', middleware.preloadClazzItem, middleware.checkClazzPermission);

router.get('/clazz/:clazzId', clazzController.fetchClazzInfo);
router.get('/clazz/:clazzId/status', clazzController.fetchClazzStatus);
router.get('/clazz/:clazzId/statList', clazzController.queryClazzStatusList);

const adminClazzController = require('./admin/clazz.controller');
router.get('/clazz/:clazzId/introduction', adminClazzController.fetchClazzIntroductionItem);
router.put('/clazz/:clazzId/introduction', adminClazzController.updateClazzIntroductionItem);

// 学员管理
const clazzAccountController = require('./mng/clazzAccount.controller');
router.get('/clazz/:clazzId/accounts', clazzAccountController.queryPagedClazzStudents);
router.put('/clazz/:clazzId/accounts', clazzAccountController.syncClazzStudents);

/***********************************************************************************************************************
 * 预装载学员信息
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/account/:accountId', middleware.preloadClazzStudentItem);

router.put('/clazz/:clazzId/account/:accountId', clazzAccountController.changeAccountClazz);
router.put('/clazz/:clazzId/account/:accountId/status', clazzAccountController.verifyClazzAccount);
router.get('/clazz/:clazzId/account/:accountId/score', clazzAccountController.queryClazzScore);
router.get('/clazz/:clazzId/account/:accountId/checkin', clazzAccountController.queryAccountCheckinStatusByDate);
router.post('/clazz/:clazzId/account/:accountId/checkin', clazzAccountController.createAccountCheinItem);

/***********************************************************************************************************************
 * 1. 必须为长期班
 * 2. 预加载长期班账户记录列表
 ***********************************************************************************************************************/
router.use('/clazz/:clazzId/account/:accountId/records', middleware.mustBeLongtermClazz, middleware.preloadLongtermClazzRecordList);

router.get('/clazz/:clazzId/account/:accountId/records', clazzAccountController.queryClazzAccountRecordList);
router.put('/clazz/:clazzId/account/:accountId/records', clazzAccountController.updateClazzAccountRecordList);

// 打卡管理
const checkinController = require('./mng/checkin.controller');
router.get('/clazz/:clazzId/checkins', checkinController.queryPagedCheckinList);
router.get('/clazz/:clazzId/unCheckins', checkinController.queryPagedUncheckinList);

/***********************************************************************************************************************
 * 预装载班级打卡信息
 * 如果不存在，则报NOT FOUND错误
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/checkin/:checkinId', middleware.preloadClazzChecinItem);

router.get('/clazz/:clazzId/checkin/:checkinId', checkinController.fetchCheckinItem);
router.put('/clazz/:clazzId/checkin/:checkinId', checkinController.updateCheckinItem);
router.post('/clazz/:clazzId/checkin/:checkinId/userScore', checkinController.createCheckinScoreRecord);

const clazzLuckyCheckinController = require('./mng/clazzLuckyCheckin.controller');
// 抽打卡管理
router.get('/clazz/:clazzId/luckyCheckin', clazzLuckyCheckinController.queryClazzLuckyCheckin);
router.post('/clazz/:clazzId/luckyCheckin', clazzLuckyCheckinController.drawCLazzCheckins);
router.get('/clazz/:clazzId/luckyCheckin/:luckyCheckinId', clazzLuckyCheckinController.fetchLuckyCheckinList);

// 任务管理
const clazzTaskController = require('./mng/clazzTask.controller');
router.get('/clazz/:clazzId/tasks', clazzTaskController.queryPagedClazzTasks);
router.post('/clazz/:clazzId/task', clazzTaskController.createClazzTask);

/***********************************************************************************************************************
 * 预装载课程任务信息
 * 如果不存在，则报NOT FOUND错误
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/task/:taskId', middleware.preloadTaskItem);

router.get('/clazz/:clazzId/task/:taskId', clazzTaskController.fetchClazzTask);
router.get('/clazz/:clazzId/task/:taskId/preview', clazzTaskController.previewTask);
router.put('/clazz/:clazzId/task/:taskId', clazzTaskController.updateClazzTask);
router.delete('/clazz/:clazzId/task/:taskId', clazzTaskController.deleteClazzTask);

// 推送任务管理
const clazzPostController = require('./mng/clazzPost.controller');
router.get('/clazz/:clazzId/posts', clazzPostController.listPagedPosts);
router.post('/clazz/:clazzId/post', clazzPostController.createPostFromClazzTask);
router.delete('/clazz/:clazzId/post/:postId', clazzPostController.deletePost);

// 任务素材管理
const clazzTaskMaterialController = require('./mng/clazzTaskMaterial.controller');
router.get('/clazz/:clazzId/materials', clazzTaskMaterialController.queryPagedMaterialList);
router.post('/clazz/:clazzId/materials', clazzTaskMaterialController.duplicateMaterials);
router.post('/clazz/:clazzId/material', clazzTaskMaterialController.createMaterial);
router.delete('/clazz/:clazzId/material/:materialId', clazzTaskMaterialController.deleteMaterial);

// 笃师一对一管理
const clazzFeedbackController = require('./mng/clazzFeedback.controller');
router.get('/clazz/:clazzId/feedbacks', clazzFeedbackController.queryPagedClazzFeedbacks);

/***********************************************************************************************************************
 * 预加载大点评对象 req.__CURRENT_CLAZZ_FEEDBACK
 *
 * 如果不存在，则报NOT FOUND错误
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/feedback/:feedbackId', middleware.preloadClazzFeedbackItem);

router.get('/clazz/:clazzId/feedback/:feedbackId', clazzFeedbackController.queryFeedbackReplyList);
router.post('/clazz/:clazzId/feedback/:feedbackId', clazzFeedbackController.replyClazzFeedback);

// 笃师一对一素材管理
const clazzFeedbackMaterialController = require('./mng/clazzFeedbackMaterial.controller');
router.get('/clazz/:clazzId/feedbackMaterials', clazzFeedbackMaterialController.queryPagedClazzFeedbackMaterials);
router.post('/clazz/:clazzId/feedbackMaterial', clazzFeedbackMaterialController.createClazzFeedbackMaterial);

/***********************************************************************************************************************
 * 预加载笃师一对一反馈素材
 *
 * 如果不存在，则报NOT FOUND错误
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/feedbackMaterial/:materialId', middleware.preloadFeedbackMaterialItem);

router.get('/clazz/:clazzId/feedbackMaterial/:materialId', clazzFeedbackMaterialController.fetchClazzFeedbackMaterial);
router.put('/clazz/:clazzId/feedbackMaterial/:materialId', clazzFeedbackMaterialController.updateClazzFeedbackMaterial);
router.delete('/clazz/:clazzId/feedbackMaterial/:materialId', clazzFeedbackMaterialController.deleteClazzFeedbackMaterial);

//用户积分相关服务
const userScoreService = require('./mng/userScore.controller');
router.put('/clazz/:clazzId/userScore/:userScoreId', middleware.preloadClazzUserScoreItem, userScoreService.updateClazzScoreRecord);

// 用户服务
const userController = require('./mng/user.controller');
router.get('/user/:userId/coupon',userController.queryUserCoupon);
router.post('/user/:userId/coupon',userController.createUserCoupon);
// router.delete('/user/:userId/coupon/:couponId',userController.removeUserCoupon);

// 用户卡券
router.get('/user/:userId/userCard', userController.queryUserCard);
router.post('/user/:userId/userCard', userController.createUserCard);
// router.delete('/user/:userId/userCard/:cardId',userController.removeUserCoupon);

// 七牛
router.post('/qiniu', qiniuController.fetchQiniuUploadToken);

// 用户文件
const userFileController = require('./mng/userFile.controller');
router.put('/userFile/:userFileId', userFileController.downloadFromWechat);

// 教师列表 - 小助手和管理员获取
const clazzTeacherController = require('./mng/clazzTeacher.controller');
router.get('/clazzTeachers', clazzTeacherController.fetchPagedTeacherList);


/***********************************************************************************************************************
 * 管理员相关功能接口
 *  - 提供管理员相关基础功能
 *
 **********************************************************************************************************************/
const adminMiddleware =  middleware;//require('./admin.middleware');
//0. 账户管理
//1. 用户管理
const userManageController = require('./admin/user.controller');
router.get('/admin/users', userManageController.queryPagedUserList);
router.put('/admin/users', userManageController.syncUserList);

/***********************************************************************************************************************
 * 定义req.__CURRENT_USER_ITEM, 获取操作的学员信息
 ***********************************************************************************************************************/
router.use('/admin/user/:userId', adminMiddleware.preloadUserItem);
router.get('/admin/user/:userId', userManageController.fetchUserDetailInfo);
router.get('/admin/user/:userId/coins', userManageController.queryUserCoinList);
router.post('/admin/user/:userId/coin', userManageController.createUserCoinItem);
router.post('/admin/user/:userId/coupon', userManageController.createUserCoupon);
router.get('/admin/user/:userId/payments', userManageController.queryUserPayList);

//2. 班级管理
const clazzManageController = require('./admin/clazz.controller');
router.get('/admin/clazzes', clazzManageController.queryClazzes);
router.post('/admin/clazz', clazzManageController.createClazzItem);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CLAZZ，获取当前班级信息
 ***********************************************************************************************************************/
router.use('/admin/clazz/:clazzId', adminMiddleware.preloadClazzItem);

router.get('/admin/clazz/:clazzId', clazzManageController.fetchClazzItem);
router.put('/admin/clazz/:clazzId', clazzManageController.updateClazzItemBasicInfo);
router.get('/admin/clazz/:clazzId/configuration', clazzManageController.fetchClazzConfiguration);
router.put('/admin/clazz/:clazzId/configuration', clazzManageController.updateClazzConfiguration);
router.get('/admin/clazz/:clazzId/introduction', clazzManageController.fetchClazzIntroductionItem);
router.put('/admin/clazz/:clazzId/introduction', clazzManageController.updateClazzIntroductionItem);

router.get('/admin/clazz/:clazzId/students', clazzManageController.queryStudentList);

const clazzNotificationController = require('./admin/clazzNotification.controller');
router.get('/admin/clazz/:clazzId/notifications', clazzNotificationController.queryPagedClazzNotifications);
router.post('/admin/clazz/:clazzId/notification', clazzNotificationController.createClazzNotification);
router.get('/admin/clazz/:clazzId/notification/:notificationId', clazzNotificationController.fetchClazzNotificationItem);

//2.1 退班管理
router.get('/admin/clazzExits', clazzManageController.queryPagedClazzExitList);
router.get('/admin/clazzExit/:clazzExitId', adminMiddleware.preloadClazzExitItem, clazzManageController.fetchClazzExitItem);
router.put('/admin/clazzExit/:clazzExitId', adminMiddleware.preloadClazzExitItem, clazzManageController.updateClazzExit);


//3. 优惠券管理
const couponManageController = require('./admin/coupon.controller');
router.get('/admin/coupons', couponManageController.queryPagedCouponList);
/***********************************************************************************************************************
 * 定义req.__CURRENT_COUPON_ITEM，获取当前优惠券信息
 ***********************************************************************************************************************/
router.use('/admin/coupon/:couponId', adminMiddleware.preloadCouponItem);
router.get('/admin/coupon/:couponId', couponManageController.fetchCouponItem);
router.put('/admin/coupon/:couponId', couponManageController.updateCouponItem);
router.delete('/admin/coupon/:couponId', couponManageController.deleteCouponItem);

//4. 财务管理
// 退款管理
const withdrawController = require('./admin/withdraw.controller');
router.get('/admin/clazz/:clazzId/withdraws', withdrawController.queryClazzAllWeeklyWithdraws);
router.get('/admin/clazz/:clazzId/withdraw', withdrawController.queryClazzWeeklyWithdraw);
router.post('/admin/clazz/:clazzId/withdraw', withdrawController.withdrawClazzWeekly);
router.get('/admin/clazz/:clazzId/withdraw/:withdrawId', withdrawController.fetchClazzWithdrawDetail);
router.get('/admin/withdraws', withdrawController.queryPagedWithdrawList);
/***********************************************************************************************************************
 * 定义req.__CURRENT_USER_WITHDRAW_ITEM，获取当前用户退款信息
 ***********************************************************************************************************************/
router.use('/admin/withdraw/:withdrawId', adminMiddleware.preloadWitdrawItem);

router.get('/admin/withdraw/:withdrawId', adminMiddleware.preloadWithdrawUserItem, withdrawController.fetchWithdrawDetails);
router.put('/admin/withdraw/:withdrawId', adminMiddleware.preloadWithdrawUserItem, withdrawController.handleUserWithdraw);
router.get('/admin/withdraw/:withdrawId/state', withdrawController.requestWithdrawState);

//5.开班接口
const openCourseController = require('./admin/openCourse.controller');
router.post('/admin/openCourse', openCourseController.createOpenCourse);

//6.管理员配置
const adminManageController = require('./admin/admin.controller');
router.post('/admin/administrator', adminManageController.createAdmin);
router.get('/admin/administrators', adminManageController.fetchPagedAdmins);
router.use('/admin/administrator/:adminId', adminMiddleware.preloadAdminItem);
router.get('/admin/administrator/:adminId/clazzes', adminManageController.fetchAdminPermittedClazzList);
router.put('/admin/administrator/:adminId/clazzes', adminManageController.resetAdminClazzPermission);

//7.推广管理
const promotionController = require('./admin/promotion.controller');
router.get('/admin/promotion/incomes', promotionController.queryPromototionIncomeList);

//8.用户卡片管理
//TODO:暂未开发

module.exports = router;
