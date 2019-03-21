'use strict';

/**
 * admin API 的路由
 */
const router = require('express').Router();

const middleware = require('./admin.middleware');

router.use(middleware.basicErrorHandler);

const adminController = require('./admin/admin.controller');
router.post('/auth', adminController.auth);

/***********************************************************************************************************************
 * 解析x-auth-token，获取当前管理员信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(middleware.parseAuthToken);

// 检查token是否有效
router.get('/auth', adminController.checkAuth);

/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(middleware.moduleLogger);

router.delete('/auth', adminController.deAuth);

// 用户管理
const userController = require('./admin/user.controller');
router.get('/users', userController.queryPagedUserList);
router.put('/users', userController.syncUserList);

/***********************************************************************************************************************
 * 定义req.__CURRENT_USER_ITEM, 获取操作的学员信息
 ***********************************************************************************************************************/
router.use('/user/:userId', middleware.preloadUserItem);

router.get('/user/:userId', userController.fetchUserDetailInfo);
router.get('/user/:userId/coins', userController.queryUserCoinList);
router.post('/user/:userId/coin', userController.createUserCoinItem);
router.post('/user/:userId/coupon', userController.createUserCoupon);
router.get('/user/:userId/payments', userController.queryUserPayList);

// 班级管理
const clazzController = require('./admin/clazz.controller');
router.get('/clazzes', clazzController.queryClazzes);
router.post('/clazz', clazzController.createClazzItem);

// //同步任务
// const scheduler = require('../cron/schedule.task');
// router.get('/clazz/sync', scheduler.statisticsStudentNumber);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CLAZZ，获取当前班级信息
 ***********************************************************************************************************************/
router.use('/clazz/:clazzId', middleware.preloadClazzItem);

router.get('/clazz/:clazzId', clazzController.fetchClazzItem);
router.put('/clazz/:clazzId', clazzController.updateClazzItemBasicInfo);
router.get('/clazz/:clazzId/configuration', clazzController.fetchClazzConfiguration);
router.put('/clazz/:clazzId/configuration', clazzController.updateClazzConfiguration);
router.get('/clazz/:clazzId/introduction', clazzController.fetchClazzIntroductionItem);
router.put('/clazz/:clazzId/introduction', clazzController.updateClazzIntroductionItem);

router.get('/clazz/:clazzId/students', clazzController.queryStudentList);

const clazzNotificationController = require('./admin/clazzNotification.controller');

router.get('/clazz/:clazzId/notifications', clazzNotificationController.queryPagedClazzNotifications);
router.post('/clazz/:clazzId/notification', clazzNotificationController.createClazzNotification);
router.get('/clazz/:clazzId/notification/:notificationId', clazzNotificationController.fetchClazzNotificationItem);

// 优惠券管理
const couponController = require('./admin/coupon.controller');
router.get('/coupons', couponController.queryPagedCouponList);

/***********************************************************************************************************************
 * 定义req.__CURRENT_COUPON_ITEM，获取当前优惠券信息
 ***********************************************************************************************************************/
router.use('/coupon/:couponId', middleware.preloadCouponItem);

router.get('/coupon/:couponId', couponController.fetchCouponItem);
router.put('/coupon/:couponId', couponController.updateCouponItem);
router.delete('/coupon/:couponId', couponController.deleteCouponItem);

// 退款管理
const withdrawController = require('./admin/withdraw.controller');
router.get('/clazz/:clazzId/withdraws', withdrawController.queryClazzAllWeeklyWithdraws);
router.get('/clazz/:clazzId/withdraw', withdrawController.queryClazzWeeklyWithdraw);
router.post('/clazz/:clazzId/withdraw', withdrawController.withdrawClazzWeekly);
router.get('/clazz/:clazzId/withdraw/:withdrawId', withdrawController.fetchClazzWithdrawDetail);

router.get('/withdraws', withdrawController.queryPagedWithdrawList);

/***********************************************************************************************************************
 * 定义req.__CURRENT_USER_WITHDRAW_ITEM，获取当前用户退款信息
 ***********************************************************************************************************************/
router.use('/withdraw/:withdrawId', middleware.preloadWitdrawItem);

router.get('/withdraw/:withdrawId', middleware.preloadWithdrawUserItem, withdrawController.fetchWithdrawDetails);
router.put('/withdraw/:withdrawId', middleware.preloadWithdrawUserItem, withdrawController.handleUserWithdraw);
router.get('/withdraw/:withdrawId/state', withdrawController.requestWithdrawState);

const openCourseController = require('./admin/openCourse.controller');
router.post('/openCourse', openCourseController.createOpenCourse);

router.post('/admin', adminController.createAdmin);
router.get('/admins', adminController.fetchPagedAdmins);

router.use('/admin/:adminId', middleware.preloadAdminItem);

router.get('/admin/:adminId/clazzes', adminController.fetchAdminPermittedClazzList);
router.put('/admin/:adminId/clazzes', adminController.resetAdminClazzPermission);

router.get('/clazzExits', clazzController.queryPagedClazzExitList);
router.get('/clazzExit/:clazzExitId', middleware.preloadClazzExitItem, clazzController.fetchClazzExitItem);
router.put('/clazzExit/:clazzExitId', middleware.preloadClazzExitItem, clazzController.updateClazzExit);

const promotionController = require('./admin/promotion.controller');
router.get('/promotion/incomes', promotionController.queryPromototionIncomeList);

module.exports = router;
