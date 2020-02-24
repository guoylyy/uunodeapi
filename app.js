'use strict';

const _ = require('lodash');
var SwaggerExpress = require('swagger-express-mw');
const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const compression = require('compression');
const debug = require('debug')('app');
const helmet = require('helmet');

const winston = require('./config/winston.config');
const systemConfig = require('./config/config');

// 获取来自nginx的ip地址
logger.token('remote-addr', (req) => {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
});



// 替换全局Promise
global.Promise = require("bluebird");

const app = express();
// 去除敏感信息
app.disable('x-powered-by');
// 去除etag，避免status code为304
app.disable('etag');
// 使用helment
app.use(helmet());

require('json.date-extensions');
JSON.useDateParser();

// compression 中间件
app.use(compression());

// 根据配置决定是否加载定时任务模块
if (systemConfig.MODULE_OPTIONS.cronModule.isOpen) {
    // 定义定时任务
    const scheduler = require('./service_modules/cron/scheduler');
}

let winstonStream = { write: (message) => winston.info(message.trim()) };
// 根据环境，选择logger版本
global.IS_DEVLOPMENT_ENVIRONMENT = app.get('env') === 'development';
if (global.IS_DEVLOPMENT_ENVIRONMENT) {
    app.use(logger('dev', { stream: winstonStream }));
} else {
    app.use(logger('common', { stream: winstonStream }));
}
app.use(bodyParser.json());

debug('app env: ', app.get('env'));
debug('app port: ', process.env.PORT || 3000);

// h5 api 路由
const isH5Open = _.get(systemConfig, 'MODULE_OPTIONS.weh5APIModule.isOpen', false);
if (isH5Open === true) {
    const apiRouter = require('./service_modules/apis/h5.router');
    app.use('/api', apiRouter);
}

// mng api 路由
const isMngOpen = _.get(systemConfig, 'MODULE_OPTIONS.mngModule.isOpen', false);
if (isMngOpen === true) {
    const mngAPIRouter = require('./service_modules/apis/mng.router');
    app.use('/mng', mngAPIRouter);
}

// mng api 路由
const isAdminOpen = _.get(systemConfig, 'MODULE_OPTIONS.adminModule.isOpen', false);
if (isAdminOpen === true) {
    const adminAPIRouter = require('./service_modules/apis/admin.router');
    app.use('/admin', adminAPIRouter);
}

// web api 路由
const isWebOpen = _.get(systemConfig, 'MODULE_OPTIONS.webApiModule.isOpen', false);
if (isWebOpen === true) {
    const webAPIRouter = require('./service_modules/apis/web.router');
    app.use('/web', webAPIRouter);
}

const isWeappOneOpen = _.get(systemConfig, 'MODULE_OPTIONS.weappOneModule.isOpen', false);
if (isWeappOneOpen === true) {
    const oneAPIRouter = require('./service_modules/apis/weapp.one.router');
    app.use('/weapp', oneAPIRouter);
}

const isAndroidSharkOpen = _.get(systemConfig, 'MODULE_OPTIONS.appSharkModule.isOpen', false);
if (isAndroidSharkOpen === true) {
    const appSharkAPIRouter = require('./service_modules/apis/app.shark.router');
    app.use('/appShark', appSharkAPIRouter);
}

const isWeappTwoOpen = _.get(systemConfig, 'MODULE_OPTIONS.weappTwoOpen.isOpen', false);
if (isWeappTwoOpen === true) {
    const twoAPIRouter = require('./service_modules/apis/weapp.two.router');
    app.use('/weapp/biyi/', twoAPIRouter);
}

app.use('/static', express.static(__dirname + '/public'))

// catch 404 and forward to error handler
app.use((req, res, next) => {
    let err = { code: 404, message: 'API Not Found' };

    next(err);
});

// error handler
app.use((err, req, res, next) => {
    winston.error('Server Error: %j', err);

    res.status(err.code || 500).json(err);
});

var config = {
  appRoot: __dirname, // required config
  swaggerFile: __dirname + '/doc/swagger/swagger.yaml'
};

global.__projectDir = __dirname;

SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  // install middleware
  swaggerExpress.register(app);
  var port = process.env.PORT || 10010;
  app.listen(port);
  if (swaggerExpress.runner.swagger.paths['/hello']) {
    console.log('try this:\ncurl http://127.0.0.1:' + port + '/hello?name=Scott');
  }
});

module.exports = app;
