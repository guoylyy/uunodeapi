const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
      CREATE TABLE `school` (
      `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
      `image` varchar(512) DEFAULT NULL,
      `name` varchar(128) DEFAULT NULL,
      `province` varchar(32) NOT NULL DEFAULT '',
      `isOpen` tinyint(4) NOT NULL DEFAULT 0,
      `createdAt` timestamp NULL DEFAULT NULL,
      `updatedAt` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB  DEFAULT CHARSET=utf8;
    */
  }));
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE school;
     */
  }));
};
