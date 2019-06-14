const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
    CREATE TABLE `uband_banner` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `redirectId` varchar(128) NOT NULL,
  `bannerType` varchar(64) DEFAULT NULL,
  `imgUrl` varchar(255) DEFAULT NULL,
  `isActive` SMALLINT(1) default 0,
  `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=784 DEFAULT CHARSET=utf8;
   */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE uband_banner;
     */
  }));
};
