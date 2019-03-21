'use strict';

/**
 * 基于redis的定时任务分发器
 */
const _ = require('lodash');
const Promise = require('bluebird');
const Redis = require('ioredis');
const winston = require('winston');
const debug = require('debug')('schedule');

const dbConfig = require('../../config/db.config');

const scheduleTask = require('./schedule.task');

const isRedisOpen = _.get(dbConfig, 'redis.isOpen', false);

const CHANNEL_NAME = 'SHARK_SCHEDULE_CHANNEL';

// 主动建立redis客户端
let publisher;

if (isRedisOpen === true) {
  publisher = new Redis({
    port: dbConfig.redis.port,    // Redis port
    host: dbConfig.redis.host,    // Redis host
    password: dbConfig.redis.auth // Redis password
  });

  publisher.on('connect', () => {
    winston.info('Redis connected');
  });

  /**
   * 错误处理
   */
  publisher.on('error', (err) => {
    debug(err);
    winston.error('Redis error happened： %j', err);
  });
}

const pub = {};

pub.createCronTask = (taskName, argsPrams, date) => {
  if (_.isNil(publisher) || _.isNil(scheduleTask[taskName])) {
    return Promise.resolve(null);
  }

  debug(taskName);
  debug(argsPrams);
  debug(date);

  return publisher.publish(CHANNEL_NAME, JSON.stringify({
    task: taskName,
    argsPrams: argsPrams,
    date: date
  }))
};

pub.subscribeTaskCron = (taskHandler) => {
  if (isRedisOpen === true) {
    const subscriber = new Redis({
      port: dbConfig.redis.port,    // Redis port
      host: dbConfig.redis.host,    // Redis host
      password: dbConfig.redis.auth // Redis password
    });

    subscriber.on('connect', () => {
      winston.info('Redis connected');
    });

    /**
     * 错误处理
     */
    subscriber.on('error', (err) => {
      debug(err);
      winston.error('Redis error happened： %j', err);
    });

    return subscriber.subscribe(CHANNEL_NAME)
        .then((x, y) => {
          debug(x);
          debug(y);

          return subscriber.on('message', taskHandler);
        })
  }
};

module.exports = pub;

// 测试代码
// {
//   const redisPub = require('./service_modules/cron/schedule.pubsub');
//   const task = require('./service_modules/cron/schedule.task');
//
//   redisPub.subscribeTaskCron((x, y) => {
//     console.log('-------');
//     console.log(x);
//     console.log(y);
//   }).then(() => {
//     const moment = require('moment');
//
//     redisPub.createCronTask('sayHello', ['world'], moment().add(10, 'seconds').toDate());
//   });
// }
