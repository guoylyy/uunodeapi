'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Redis = require('ioredis');
const winston = require('winston');
const debug = require('debug')('component');

const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-ioredis');

const dbConfig = require('../../../config/db.config');

const isRedisOpen = _.get(dbConfig, 'redis.isOpen', false);
const SYSTEM_PREFIX = dbConfig.redis.systemPrefix;

// 主动建立redis客户端
let client;

let redisCache;

if (isRedisOpen === true) {
  redisCache = cacheManager.caching({
    store: redisStore,
    host: dbConfig.redis.host,      // Redis host
    port: dbConfig.redis.port,      // Redis port
    password: dbConfig.redis.auth,  // Redis password
    ttl: 86400                      // 24h * 60m/h * 60s/m
  });

  client = redisCache.store.getClient();

  client.on('connect', () => {
    winston.info('Redis connected');
  });

  /**
   * 错误处理
   */
  client.on('error', (err) => {
    debug(err);
    winston.error('Redis error happened： %j', err);
  });
}

const pub = {};

pub.wrap = (keyPrefix, func, ...params) => {
  if (_.isNil(client)) {
    debug(' cache is not open ');
    return Promise.resolve(func(...params));
  } else {
    debug(' cache is open ');

    const paramsString = params.join('_');
    const redisKey = `${ SYSTEM_PREFIX }_${ keyPrefix }_${ paramsString }`;

    return redisCache.wrap(redisKey, () => {
      return func(...params);
    });
  }
};


/**
 * 加入到缓存中
 * @param key
 * @param val
 */
pub.set = (key, val) => {
  if (_.isNil(client)) {
    debug('=== NO REDIS CLIENT ===')
    return Promise.resolve(null);
  } else {
    debug('=== FIND REDIS CLIENT ===')
    return redisCache.set(`${ SYSTEM_PREFIX }_${ key }`, val);
  }
};

/**
 * 删除缓存数据
 * @param key
 */
pub.del = (key) => {
  if (_.isNil(client)) {
    return Promise.resolve(null);
  }

  return redisCache.del(`${ SYSTEM_PREFIX }_${ key }`);
};


/**
 * 获取缓存数据
 * @type {{}}
 */
pub.get = (key) =>{
  if (_.isNil(client)) {
    debug('=== NO REDIS CLIENT ===')
    return Promise.resolve(null);
  }
  return redisCache.get(`${ SYSTEM_PREFIX }_${ key }`);
};

module.exports = pub;
