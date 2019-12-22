const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
      CREATE TABLE `user_config` (
      `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
      `userId` int(11) DEFAULT NULL COMMENT '用户ID',
      `configApp` varchar(32) DEFAULT NULL COMMENT '配置客户端类型',
      `configType` varchar(32) DEFAULT NULL COMMENT '配置类型',
      `configValue` varchar(128) DEFAULT NULL COMMENT '配置参数',
      `isValid` tinyint(4) NOT NULL DEFAULT 1 COMMENT '是否启用',
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
     DROP TABLE user_config;
     */
  }));
};
