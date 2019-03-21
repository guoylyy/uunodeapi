const multiline = require('multiline');

exports.up = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
    CREATE TABLE `uband_coin` (
    `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
    `userId` int(11) unsigned DEFAULT NULL,
    `coinChange` int(11) DEFAULT NULL COMMENT '单位：分',
    `transactionId` char(128) DEFAULT NULL,
    `title` varchar(64) DEFAULT NULL,
    `remark` varchar(255) DEFAULT NULL,
    `changeDate` date DEFAULT NULL COMMENT '更新时间',
    `ext_params` text DEFAULT NULL,
    `createdAt` timestamp NULL DEFAULT NULL COMMENT '创建时间',
    `updatedAt` timestamp NULL DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `uband_coin_index_transaction_id` (`userId`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
   */
  }));
};

exports.down = function (knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     DROP TABLE uband_coin;
     */
  }));
};
