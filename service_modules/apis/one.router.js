'use strict';

/**
 * web API 的路由
 */
const router = require('express').Router();

const bodyParser = require('body-parser');
const oneMiddleware = require('./one.middleware');
const middleware = require('./h5.middleware');

/**
 * 定义全局基本错误处理方法(req.__ERROR_HANDLER)，方便使用
 */
router.use(oneMiddleware.basicErrorHandler);

/**
 * 微信授权接口
 */
const wechatApi = require('./one/wechat.api');
router.post('/wechat/auth', wechatApi.authWechatLogin);

// 仅开发环境暴露
if (global.IS_DEVLOPMENT_ENVIRONMENT) {
  router.post('/account', wechatApi.auth);
}

// 七牛回调处理
const qiniuController = require('./one/qiniu.controller');
router.post('/qiniu/callback', bodyParser.urlencoded({ extended: false }), qiniuController.qiniuCallbackHandler);

const accountApis = require('./h5/account.controller');

/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(oneMiddleware.parseAuthToken);

/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(oneMiddleware.moduleLogger);

// 用户相关
router.get('/account', accountApis.getUserBaseInfo);

// 更新token
router.get('/account/token', wechatApi.refreshAuthToken);

// 用户登出
router.delete('/account', wechatApi.deleteToken);

router.post('/qiniu', qiniuController.fetchQiniuUploadToken);

// 课程相关API
const clazzApis = require('./one/clazz.controller');
router.get('/clazzes', clazzApis.queryClazzList);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CLAZZ
 **********************************************************************************************************************/
router.use('/clazz/:clazzId', middleware.preloadClazzItem);


// 笃师一对一API
const h5ClazzFeedbackApis = require('./h5/clazzFeedback.controller');
const clazzFeedbackApi = require('./one/clazzFeedback.controller');

/***********************************************************************************************************************
 * 1. 检查课程是否配置了笃师一对一
 * 2. 用户必须为笃师
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/', middleware.checkHasJoinClass, middleware.checkIsFeedbackAvailable, middleware.mustBeClazzTeacher);

router.get('/clazz/:clazzId/feedbacks', h5ClazzFeedbackApis.listFeedbacks);
router.get('/clazz/:clazzId/feedback/materials', h5ClazzFeedbackApis.listFeedbackMaterials);
router.get('/clazz/:clazzId/feedback/material/:materialId', h5ClazzFeedbackApis.fetchFeedbackMaterial);

/***********************************************************************************************************************
 * 定义req.__CURRENT_CLAZZ_FEEDBACK
 **********************************************************************************************************************/
router.use('/clazz/:clazzId/feedback/:feedbackId', middleware.preloadFeedbackItem);

router.get('/clazz/:clazzId/feedback/:feedbackId', h5ClazzFeedbackApis.listFeedbackReplys);
router.put('/clazz/:clazzId/feedback/:feedbackId', clazzFeedbackApi.updateFeedbackStatus);
router.post('/clazz/:clazzId/feedback/:feedbackId', h5ClazzFeedbackApis.replyFeedback);

module.exports = router;
