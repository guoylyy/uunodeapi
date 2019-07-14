'use strict';

/**
 * MNG API 的路由
 *
 *  * 友班大管理系统的配置
 *
 */
const router = require('express').Router();
const middleware = require('./mng.middleware');
const bodyParser = require('body-parser');
router.use(middleware.basicErrorHandler);

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

const clazzPlayController = require('./mng/clazzPlay.controller');
router.get('/clazz/:clazzId/plays', clazzPlayController.queryClazzPlayList);
router.post('/clazz/:clazzId/play', clazzPlayController.createClazzPlay);

router.use('/clazz/:clazzId/play/:playId', middleware.preloadClazzPlay);

router.get('/clazz/:clazzId/play/:playId', clazzPlayController.fetchClazzPlay);
router.put('/clazz/:clazzId/play/:playId', clazzPlayController.updateClazzPlay);
router.delete('/clazz/:clazzId/play/:playId', clazzPlayController.deleteClazzPlay);

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

// 班级活动管理
const activityController = require('./mng/clazzActivity.controller');
router.post('/activity/room', activityController.matchUnmatchActivityAccountList);
router.put('/activity/room', activityController.dismissQuietGroupAndRematch);
router.get('/activity/account/statistics', activityController.queryUnmatchActivityAccountStatistics);

/***********************************************************************************************************************
 * 管理员相关功能接口
 *  - 提供管理员相关基础功能
 *  - TODO: 财务查看的功能
 *  - TODO: 推广辅助工具（链接生成，优惠码）
 *  
 **********************************************************************************************************************/
//0. 账户管理

//1. 用户管理

//2. 班级管理

//2.1 退班管理

//3. 优惠券管理

//4. 财务管理


module.exports = router;
