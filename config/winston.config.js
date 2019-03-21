'use strict';

/**
 * winston日志工具配置，在app.js中使用
 * 其他地方直接使用 const winston = require('winston'); 即可
 */
const winston = require('winston');
const winstonRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');

const env = process.env.NODE_ENV || 'development';
const logDir = 'log';

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const tsFormat = () => (new Date()).toLocaleTimeString();

winston.add(winstonRotateFile, {
    filename: `${logDir}/-results.log`,
    timestamp: tsFormat,
    datePattern: 'yyyy-MM-dd',
    prepend: true,
    level: env === 'development' ? 'debug' : 'info'
});

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    timestamp: tsFormat,
    colorize: true,
    level: 'info'
});

module.exports = winston;
