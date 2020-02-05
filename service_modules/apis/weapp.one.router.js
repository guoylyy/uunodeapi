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
const commonApis = require('./weapp.one/common.controller');

router.post('/wechat/auth', wechatApi.authWechatLogin);
router.get('/teachers',  clazzTeacherApis.fetchAllTeacherList);
router.get('/teacher/:teacherId', clazzTeacherApis.fetchTeacherDetail);
router.get('/schools',commonApis.querySchools); //搜索学校

// System相关接口
router.get('/system/enums', commonApis.getSystemEnums);

// router.post('/wechat/pay', commonMiddleware.wechatXmlParser, wechatApi.wechatPaymentCallbackHandler);

const shareController = require('./weapp.one/share.controller');
// 分享相关接口
router.use('/share', oneMiddleware.tryParseAuthToken);
router.get('/share/task/:taskId/checkin/:checkinId', oneMiddleware.preloadTaskCheckin, shareController.getCheckin)

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

//分享打卡动作记录
router.post('/share/task/:taskId/checkin/:checkinId', shareController.shareCheckin);

// @yiliang
const accountApis = require('./weapp.one/account.controller');
// 账户相关API
// router.get('/account/homeInfo') //主页的内容
router.get('/account/info', accountApis.getAccountBaseInfo); //个人信息
router.put('/account/info', accountApis.updateAccountInfo); //更新个人信息
router.put('/account/info/school', accountApis.updateAccountSchool); //更新个人学校
router.put('/account/info/certifications', accountApis.updateAccountCertifications); //更新个人证书

router.get('/account/personalConfig/:configApp', accountApis.fetchUserPersonConfiguration); //设置个性化练习设置
router.put('/account/personalConfig/:configApp', accountApis.updateUserPersonConfiguration); //设置个性化练习设置

router.get('/account/like/sum', accountApis.fetchUserLikeSum); //个人笔芯记录
router.get('/account/likes', accountApis.fetchUserLikes);    //用户笔芯记录
router.get('/account/like/rules', accountApis.fetchUserLikeRules); //个人笔芯规则
router.get('/account/like/tasks', accountApis.fetchUserLikeTasks); //个人笔芯任务获取情况

router.get('/account/statistics/checkin', accountApis.fetchTaskCheckinStatistics) //练习档案
router.get('/account/statistics/checkinRecords', accountApis.fetchTaskCheckinRecords) //口译记录
router.get('/account/statistics/checkinWeekRank', accountApis.fetchCheckinWeekRank) //我的排行榜-努力榜
router.get('/account/statistics/likeCountWeekRank', accountApis.fetchLikeCountWeekRank) //我的排行榜-笔芯榜
router.get('/account/statistics/school/checkinWeekRank', accountApis.fetchSchoolCheckinWeekRank) //学校排行榜-努力榜
router.get('/account/statistics/school/likeCountWeekRank', accountApis.fetchSchoolLikeCountWeekRank) //学校排行榜-笔芯榜
// router.get('/account/checkins') //个人口译记录筛选

// @HuPeng
// 任务练习相关API
const taskController = require('./weapp.one/task.controller');
router.get('/task/today',taskController.getTodayTask) //获取今日任务
router.get('/tasks', taskController.getTaskList) //往期材料搜索
router.get('/task/:taskId', taskController.getTask) //获取任务详细内容

router.use('/task/:taskId', oneMiddleware.preloadTask) //预加载task对象并校验
router.post('/task/:taskId/checkin', taskController.checkin) //完成练习
router.get('/task/:taskId/checkin/mine', taskController.getMyCheckinList) // 我的打卡列表
router.get('/task/:taskId/checkin', taskController.getCheckinList) //获取广场内容
router.use('/task/:taskId/checkin/:checkinId', oneMiddleware.preloadTaskCheckin) //预加载task对象并校验
router.delete('/task/:taskId/checkin/:checkinId', oneMiddleware.checkMyTaskCheckin, taskController.deleteTaskCheckin) //删除打卡记录
router.put('/task/:taskId/checkin/:checkinId', oneMiddleware.checkMyTaskCheckin, taskController.updateTaskCheckin) //更新打卡记录标题
router.post('/task/:taskId/checkin/:checkinId/viewLog', taskController.addViewLog) //新增观看记录
router.post('/task/:taskId/checkin/:checkinId/like', taskController.likeCheckin) //笔芯
router.delete('/task/:taskId/checkin/:checkinId/like', taskController.cancelLikeCheckin) //取消笔芯
router.get('/task/:taskId/checkin/:checkinId/shareInfo', taskController.getShareInfo) // 获取分享信息

// 学习材料
const lessonController = require('./weapp.one/lesson.controller');

router.get('/lessons', lessonController.getLessonList)
router.get('/lesson/:lessonId',lessonController.getLesson)
router.get('/lessons/banners', lessonController.getBanners)

// 课程相关API
// const clazzApis = require('./weapp.one/clazz.controller');
// router.get('/clazzes', clazzApis.queryClazzList);
// const checkinApis = require('./weapp.one/clazzCheckin.controller');
// router.use('/clazz/:clazzId', oneMiddleware.preloadClazzItem);
// router.use('/clazz/:clazzId', oneMiddleware.checkHasJoinClass);
// router.post('/clazz/:clazzId/checkin', oneMiddleware.markCanCheckin, checkinApis.createClazzCheckin);

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
