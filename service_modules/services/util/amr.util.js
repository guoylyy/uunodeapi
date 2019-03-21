'use strict';

const _ = require('lodash');
const debug = require('debug')('util');
const winston = require('winston');
const exec = require('child_process').exec;
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const ffmpegPath = ffmpeg.path;
const Promise = require('bluebird');

module.exports = (amrPath, savePath) => {
  debug(amrPath, savePath);
  return new Promise((resolve, reject) => {
    let basename = path.basename(amrPath);

    let etc = _.split(basename, '.')[1];
    if (etc !== 'amr') {
      winston.error('转换音频失败， 参数错误，非amr文件');
      return reject(new Error('Not amr file!'));
    }

    let cmdStr = ffmpegPath + ' -y -i ' + amrPath + ' -vn -ar 8000 -ab 32k ' + savePath;
    debug(cmdStr);
    exec(cmdStr, (err, stdout, stderr) => {
      if (err) {
        winston.error(err);
        winston.error(stderr);
        return reject(stderr);
      }

      return resolve(savePath);
    });
  });
};
