const multiline = require('multiline');

exports.up = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
    ALTER TABLE `user_pay` ADD `payway` CHAR(32)
    NULL
    DEFAULT NULL
    COMMENT '支付方式'
    AFTER `status`
   */
  })).then((result) => {
    return knex.schema.raw(multiline.stripIndent(() => {
      /*
      update `user_pay` set `payway` = "wechat"
     */
    }));
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.raw(multiline.stripIndent(() => {
    /*
     ALTER TABLE `user_pay`
     DROP COLUMN `payway`;
     */
  }));
};
