const multiline = require('multiline');

exports.up = function(knex, Promise) {
    return knex.schema.raw(multiline.stripIndent(() => {
    /*
      alter table `user`
      add  target varchar(256) default null
    */
      }));
};

exports.down = function(knex, Promise) {
    return knex.schema.raw(multiline.stripIndent(() => {
        /*
         alter table `user`
         drop column target
         */
    }));
};
