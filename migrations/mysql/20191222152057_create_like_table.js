const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
      CREATE TABLE `like` (
      `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
      `userId` int(11) DEFAULT NULL COMMENT '用户ID',
      `likeType` varchar(32) DEFAULT NULL COMMENT '笔芯类型(来源)',
      `likeRemark` varchar(128) DEFAULT NULL COMMENT '笔芯备注',
      `outBizId` int(11) DEFAULT NULL COMMENT '业务关联ID(来源)',
      `likeCount` int(11) NOT NULL DEFAULT 1 COMMENT '分值',
      `isValid` tinyint(4) NOT NULL DEFAULT 0 COMMENT '是否正确',
      `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
      `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB  DEFAULT CHARSET=utf8;
    */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE like;
     */
  }));
};
