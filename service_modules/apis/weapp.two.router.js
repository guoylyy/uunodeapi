'use strict';
/**
 * 友班打卡小程序 API 的路由
 */
const _ = require('lodash');
const bodyParser = require('body-parser');
const router = require('express').Router();
const twoMiddleware = require('./weapp.two.middleware');
/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
router.use(twoMiddleware.basicErrorHandler);
const wechatApi = require('./weapp.two/wechat.api');
// 仅开发环境暴露
if (global.IS_DEVLOPMENT_ENVIRONMENT) {
  router.post('/account/auth', wechatApi.auth);
}

const qiniuController = require('./weapp.two/qiniu.controller');
router.post('/qiniu/callback', bodyParser.urlencoded({ extended: false }), qiniuController.qiniuCallbackHandler);

/**
 * 微信授权接口
 */
const commonMiddleware = require('./common.middleware');
const clazzTeacherApis = require('./weapp.two/clazzTeacher.controller');
const commonApis = require('./weapp.two/common.controller');

router.post('/wechat/auth', wechatApi.authWechatLogin);
router.get('/teachers',  clazzTeacherApis.fetchAllTeacherList);
router.get('/teacher/:teacherId', clazzTeacherApis.fetchTeacherDetail);
router.get('/schools',commonApis.querySchools); //搜索学校

// System相关接口
router.get('/system/enums', commonApis.getSystemEnums);

// router.post('/wechat/pay', commonMiddleware.wechatXmlParser, wechatApi.wechatPaymentCallbackHandler);

// const shareController = require('./weapp.two/share.controller');
// 分享相关接口
// router.use('/share', twoMiddleware.tryParseAuthToken);
// router.get('/share/task/:taskId/checkin/:checkinId', twoMiddleware.preloadTaskCheckin, shareController.getCheckin)


// 任务练习相关API
const taskController = require('./weapp.two/task.controller');
router.get('/task/today',twoMiddleware.tryParseAuthToken, taskController.getTodayTask) //获取今日任务
router.get('/tasks', taskController.getTaskList) //往期材料搜索

// 学习材料
const lessonController = require('./weapp.two/lesson.controller');
router.get('/lessons', lessonController.getLessonList)
router.get('/lesson/:lessonId',lessonController.getLesson)
router.get('/lessons/banners', lessonController.getBanners)

/***********************************************************************************************************************
 * 检查是否加入了默认班级
 ***********************************************************************************************************************/
// router.use(twoMiddleware.checkHasAddDefaultClazz);
/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(twoMiddleware.parseAuthToken);
/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(twoMiddleware.moduleLogger);

//分享打卡动作记录
// router.post('/share/task/:taskId/checkin/:checkinId', shareController.shareCheckin);

// @yiliang
const accountApis = require('./weapp.two/account.controller');
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
router.get('/task/:taskId', taskController.getTask) //获取任务详细内容
router.use('/task/:taskId', twoMiddleware.preloadTask) //预加载task对象并校验
router.post('/task/:taskId/checkin', taskController.checkin) //完成练习
router.get('/task/:taskId/checkin/mine', taskController.getMyCheckinList) // 我的打卡列表
router.get('/task/:taskId/checkin', taskController.getCheckinList) //获取广场内容
router.use('/task/:taskId/checkin/:checkinId', twoMiddleware.preloadTaskCheckin) //预加载task对象并校验
router.put('/task/:taskId/checkin/:checkinId', twoMiddleware.checkMyTaskCheckin, taskController.updateTaskCheckin) //更新打卡记录译文
router.post('/task/:taskId/checkin/:checkinId/like', taskController.likeCheckin) //笔芯
router.delete('/task/:taskId/checkin/:checkinId/like', taskController.cancelLikeCheckin) //取消笔芯
router.get('/task/:taskId/checkin/:checkinId/shareInfo', taskController.getShareInfo) // 获取分享信息

// 七牛
router.post('/qiniu', qiniuController.fetchQiniuUploadToken);

module.exports = router;
