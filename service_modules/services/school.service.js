'use strict';

const schoolMapper = require('../dao/mysql_mapper/school.mapper');

let pub = {};

/**
 * 模糊查询高校列表
 * @param name
 */
pub.querySchool = (name) =>{
  let keywordLikeOperator = {
    operator: 'LIKE',
    value: `%${name}%`
  };
  return schoolMapper.queryAll({'name':keywordLikeOperator});
};

module.exports = pub;
