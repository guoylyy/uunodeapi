'use strict';

/**
 * web API 的路由
 */
const router = require('express').Router();

const bodyParser = require('body-parser');
const h5Middleware = require('./h5.middleware');
const middleware = require('./web.middleware');

/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
router.use(h5Middleware.basicErrorHandler);

/**
 * 微信授权接口
 */
const wechatApi = require('./web/wechat.api');
router.get('/wechat/auth', wechatApi.fetchWechatAuthUrl);
router.post('/wechat/auth', wechatApi.authWechatLogin);

// 七牛回调处理
const qiniuController = require('./web/qiniu.controller');
router.post('/qiniu/callback', bodyParser.urlencoded({ extended: false }), qiniuController.qiniuCallbackHandler);

const accountApis = require('./h5/account.controller');

// 仅开发环境暴露
if (global.IS_DEVLOPMENT_ENVIRONMENT) {
  router.post('/user/auth', accountApis.auth);
}

/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(h5Middleware.parseAuthToken);


/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(middleware.moduleLogger);

// 用户相关
router.get('/account', accountApis.getUserBaseInfo);

// 课程相关API
const clazzApis = require('./h5/clazz.controller');

router.get('/clazzes', clazzApis.queryClazzList);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CLAZZ
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', h5Middleware.preloadClazzItem);

router.get('/clazz/:clazzId', clazzApis.fetchClazz);
router.get('/clazz/:clazzId/introduction', h5Middleware.preloadClazzIntroductionItem, clazzApis.fetchClazzIntroduction);

/***********************************************************************************************************************
 * 检查用户是否已经加入课程, 并定义__IS_CURRENT_CLAZZ_TEACHER表示当前用户是否为课程笃师
 * 之后的接口都要求用户已经加入了课程，否则报401, 权限不足
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', h5Middleware.checkHasJoinClass);

router.get('/clazz/:clazzId/strategy', h5Middleware.preloadClazzIntroductionItem, clazzApis.fetchClazzStrategy);

// 课程任务相关API
const clazzTaskApis = require('./web/clazzTask.controller');
const h5ClazzTaskApis = require('./h5/clazzTask.controller');
router.get('/clazz/:clazzId/tasks', clazzTaskApis.queryClazzTaskList);
router.get('/clazz/:clazzId/task/:taskId', h5ClazzTaskApis.fetchClazzTaskItem);
router.get('/clazz/:clazzId/task/:taskId/replies', h5ClazzTaskApis.fetchReplies);


// 打卡相关API
const checkinApis = require('./h5/checkin.controller');
router.get('/clazz/:clazzId/checkins', checkinApis.queryCheckinList);
router.get('/clazz/:clazzId/checkin', h5Middleware.markCanCheckin, checkinApis.queryCheckinStatus);
router.post('/clazz/:clazzId/checkin', h5Middleware.markCanCheckin, checkinApis.createClazzCheckin);

const webCheckinApis = require('./web/checkin.controller');
router.post('/clazz/:clazzId/checkin/file', webCheckinApis.createCheckinFile);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CHECKIN
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/checkin/:checkinId', h5Middleware.preloadCheckinItem);

router.get('/clazz/:clazzId/checkin/:checkinId', checkinApis.fetchCheckinItem);
router.put('/clazz/:clazzId/checkin/:checkinId', checkinApis.updateCheckinItem);
router.delete('/clazz/:clazzId/checkin/:checkinId', checkinApis.deleteCheckin);

// 七牛
router.post('/qiniu', qiniuController.fetchQiniuUploadToken);

module.exports = router;
