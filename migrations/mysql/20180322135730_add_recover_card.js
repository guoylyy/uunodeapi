const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
    CREATE TABLE `uband_card` (
    `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
    `userId` int(11) unsigned DEFAULT NULL,
    `title` varchar(64) DEFAULT NULL,
    `remark` varchar(255) DEFAULT NULL,
    `scope` varchar(64) DEFAULT NULL COMMENT '应用范围 友班通用 | 单一课程',
    `type` varchar(64) DEFAULT NULL COMMENT '卡片类型 复活卡 | 免单卡',
    `status` varchar(64) DEFAULT NULL COMMENT '卡片状态 已使用 | 未使用 | 已过期',
    `iconUrl` varchar(255) DEFAULT NULL COMMENT '卡片图片',
    `expireDate` date DEFAULT NULL COMMENT '过期时间',
    `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
    `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
   */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE uband_card;
     */
  }));
};
