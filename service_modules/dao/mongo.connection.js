'use strict';

const mongoose = require('mongoose');
const winston = require('winston');

const config = require('../../config/db.config');

const mongoPlugin = require('./mongo.plugin');
const Promise = require('bluebird');

// 使用ES6 Promise
mongoose.Promise = Promise;

// 定义mongoose全局plugin
mongoose.plugin(mongoPlugin.lastModifiedPlugin);
mongoose.plugin(mongoPlugin.saveErrorHandlerPlugin);
mongoose.plugin(mongoPlugin.paginatePlugin);
mongoose.plugin(mongoPlugin.baseCRUDPlugin);

let connectToMongo = function () {
  mongoose.connect(config.mongodb.uri, config.mongodb.options).catch(error => {
    winston.error("error to connect " + config.mongodb.uri);
    winston.error(error);
  });
};

// Create the database connection
connectToMongo();

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {
  winston.info('Mongoose connected');
});

// If the connection throws an error
mongoose.connection.on('error', function (err) {
  winston.error('Mongoose connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  winston.info('Mongoose disconnected');

  // tries to reconnect mongodb
  connectToMongo();
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    winston.info('Mongoose disconnected through app termination');
    process.exit(0);
  });
});

module.exports = mongoose;
