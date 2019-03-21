'use strict';

const _ = require('lodash');
const systemConfig = require("../../../config/config");
const debug = require('debug')('util');

let pub = {};

/**
 * 学号生成函数
 *
 * @param maxStudentNumber
 * @returns {function()}
 */
pub.calculateNextStudentNumber = (maxStudentNumber) => {
  const studentNumberPrefix = _.get(systemConfig, ['STUDENT_NUMBER_CONFIG', 'STUDENT_NUMBER_PREFIX'], 'C'),  // 学号前缀
      studentNumberStart = _.get(systemConfig, ['STUDENT_NUMBER_CONFIG', 'STUDENT_NUMBER_START'], '30000'), // 学号起始值
      studentNumberMax = _.get(systemConfig, ['STUDENT_NUMBER_CONFIG', 'STUDENT_NUMBER_END'], 99999);

  const studentNumberStartNumber = Number(studentNumberStart),
      studentNumberMaxNumber = Number(maxStudentNumber.substring(1));

  let nextStudentNumberPostfix;

  if (studentNumberStartNumber > studentNumberMaxNumber) {
    nextStudentNumberPostfix = studentNumberStartNumber;
  } else {
    nextStudentNumberPostfix = studentNumberMaxNumber + 1;
  }

  return () => {
    if (nextStudentNumberPostfix > studentNumberMax) {
      throw new Error('student number exceeded the upper limit');
    }

    const nextStudentNumber = `${ studentNumberPrefix }${ nextStudentNumberPostfix }`;

    nextStudentNumberPostfix += 1;

    return nextStudentNumber;
  };
};

module.exports = pub;
