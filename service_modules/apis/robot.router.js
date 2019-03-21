'use strict';

/**
 * mng API 的路由
 */
const router = require('express').Router();

const middleware = require('./robot.middleware');

router.use(middleware.basicErrorHandler);

const robotApis = require('./robot/robot.controller');
router.post('/auth', robotApis.auth);

/***********************************************************************************************************************
 * 解析x-auth-token，获取用户信息
 * 之后的接口都需要登录
 **********************************************************************************************************************/
router.use(middleware.parseAuthToken);

// 检查token是否有效
router.get('/auth', robotApis.checkAuth);
router.delete('/auth', robotApis.deAuth);

/***********************************************************************************************************************
 * 定义req.__MODULE_LOGGER来处理模块日志
 ***********************************************************************************************************************/
router.use(middleware.moduleLogger);

const clazzApis = require('./robot/clazz.controller');

router.use('/student/:studentNumber', middleware.preloadStudentItem);

router.get('/student/:studentNumber/clazzes', clazzApis.queryClazzList);

module.exports = router;
