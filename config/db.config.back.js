'use strict';

exports.mysql = {
    client: 'mysql2',
    connection: {
        host: '127.0.0.1',
        port: '3306',
        user: 'root',
        password: 'abc123abc123',
        database: 'shark',
        charset: 'utf8mb4'
    },
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        directory: __dirname + "/../migrations/mysql",
        tableName: 'knex_migrations'
    },
    debug: true
};

exports.mongodb = {
    uri: 'mongodb://127.0.0.1:27017/shark-platform', //'mongodb://localhost/shark-platform?authSource=admin',
    options: {
        server: {
            poolSize: 4,
            socketOptions: {
                keepAlive: 300000,
                connectTimeoutMS: 30000
            }
        },
        replset: {
            socketOptions: {
                keepAlive: 300000,
                connectTimeoutMS: 30000
            }
        }
    },
    debug: true
};
/**
 * Redis配置
 * @type {{host: string, port: number, isOpen: boolean}}
 */
exports.redis = {
    host: '127.0.0.1',
    port: 6379,
    isOpen: true,
    systemPrefix:'GLOBIT'
};
