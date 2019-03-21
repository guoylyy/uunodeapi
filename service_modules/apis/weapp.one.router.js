'use strict';
/**
 * 友班打卡小程序 API 的路由
 */
const _ = require('lodash');
const bodyParser = require('body-parser');
const router = require('express').Router();
const oneMiddleware = require('./weapp.one.middleware');
const h5Middleware = require('./h5.middleware');
/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
router.use(oneMiddleware.basicErrorHandler);
const wechatApi = require('./weapp.one/wechat.api');
// 仅开发环境暴露
if (global.IS_DEVLOPMENT_ENVIRONMENT) {
  router.post('/account/auth', wechatApi.auth);
}

const qiniuController = require('./weapp.one/qiniu.controller');
router.post('/qiniu/callback', bodyParser.urlencoded({ extended: false }), qiniuController.qiniuCallbackHandler);

/**
 * 微信授权接口
 */
const commonMiddleware = require('./common.middleware');
const clazzTeacherApis = require('./weapp.one/clazzTeacher.controller');

router.post('/wechat/auth', wechatApi.authWechatLogin);
router.get('/teachers',  clazzTeacherApis.fetchAllTeacherList);

// router.post('/wechat/pay', commonMiddleware.wechatXmlParser, wechatApi.wechatPaymentCallbackHandler);
// router.get('/teacher/:teacherId', clazzTeacherApis.fetchTeacherDetail);
/***********************************************************************************************************************
 * 检查是否加入了默认班级
 ***********************************************************************************************************************/
// router.use(oneMiddleware.checkHasAddDefaultClazz);
/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(oneMiddleware.parseAuthToken);
/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(oneMiddleware.moduleLogger);

// 课程相关API
const clazzApis = require('./weapp.one/clazz.controller');
router.get('/clazzes', clazzApis.queryClazzList);



const checkinApis = require('./weapp.one/clazzCheckin.controller');
router.use('/clazz/:clazzId', oneMiddleware.preloadClazzItem);
router.use('/clazz/:clazzId', oneMiddleware.checkHasJoinClass);
router.post('/clazz/:clazzId/checkin', oneMiddleware.markCanCheckin, checkinApis.createClazzCheckin);

// 七牛
router.post('/qiniu', qiniuController.fetchQiniuUploadToken);

/***********************************************************************************************************************
 * (一下是已经废弃的小程序环信聊天接口)
 * 1. 定义req.__CURRENT_CLAZZ
 * 2. 检查是否已经加入班级
 * 3. 获取环信第三方用户绑定信息
 **********************************************************************************************************************/
// router.use(
    // '/clazz/:clazzId/',
    // h5Middleware.preloadClazzItem,
    // h5Middleware.checkHasJoinClass,
    // oneMiddleware.preloadEasemobUserInfo
// );
// router.get('/clazz/:clazzId/easemob', clazzApis.getEasemobUserBindInfo);

/***********************************************************************************************************************
 * 1. 必须为笃师
 * 2. 预装载学员 用户 班级账户 第三方环信 信息
 ***********************************************************************************************************************/
// router.use('/clazz/:clazzId/user/:userId/status', h5Middleware.mustBeClazzTeacher, oneMiddleware.preloadClazzStudentItem);

// const clazzFeedbackApis = require('./weapp.one/clazzFeedback.controller');
// router.get('/clazz/:clazzId/user/:userId/status', clazzFeedbackApis.fetchClazzFeedbackStatus);
// router.put('/clazz/:clazzId/user/:userId/status', clazzFeedbackApis.updateClazzFeedbackStatus);

// router.get('/clazz/:clazzId/payment', clazzFeedbackApis.fetchFeedbackPaymentDetails);
// router.post('/clazz/:clazzId/payment', clazzFeedbackApis.userPayClazzFeedback);
// router.get('/clazz/:clazzId/teacher/:teacherUserId/status', oneMiddleware.preloadFeedbackTeacher, clazzFeedbackApis.fetchClazzTeacherFeedbackStatus);

/***********************************************************************************************************************
 * 添加默认环信好友
 ***********************************************************************************************************************/
// router.use('/clazz/:clazzId', oneMiddleware.friendDefaultEasemobUser);

// router.get('/clazz/:clazzId', clazzApis.fetchUserPartnerResult);
// router.get('/clazz/:clazzId/strangers', clazzApis.queryClazzEasemobStrangerUserBindList);
// router.post('/clazz/:clazzId/contact/:userBindId', oneMiddleware.preloadClazzEasemobFriendUserBind, clazzApis.addClazzEasemobFriend);

// const openCourseController = require('./weapp.one/openCourse.controller');
// router.get('/openCourses', openCourseController.queryOpenCourseList);

/***********************************************************************************************************************
 * 1. 预加载公开课条目
 * 2. 预装载是否已经加入公开课
 ***********************************************************************************************************************/
// router.use('/openCourse/:openCourseId', oneMiddleware.preloadOpenCourse, oneMiddleware.preloadUserOpenCourseRelation);

// router.get('/openCourse/:openCourseId', openCourseController.fetchOpenCourseItem);
// router.get('/openCourse/:openCourseId/users', openCourseController.fetchOpenCourseMembers);

/***********************************************************************************************************************
 * 预装载环信第三方用户信息
 ***********************************************************************************************************************/
// router.use('/openCourse/:openCourseId', oneMiddleware.preloadEasemobUserInfo);

// router.post('/openCourse/:openCourseId/user', openCourseController.addUserToOpenCourse);
// router.get('/openCourse/:openCourseId/easemob', openCourseController.fetchOpenCourseEasemobInfo);

module.exports = router;
