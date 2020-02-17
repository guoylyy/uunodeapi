# uunodeapi
Uband nodejs 后端独立平台

后台接口除登录和第三方回调接口之外，均采用Statless Token，需要在http header中设置X-Auth-Token来进行权限校验，校验通过后将在req中设置__CURRENT_USER对象来表示当前用户

## 运行环境：

* node 6.2.2 及以上
* npm 3.9.5 及以上
* mysql 5.7.15 及以上
* mongodb 3.4.3 及以上


### 项目结构
```
├── app.js                              -- 项目整体配置
├── bin                                 -- 可执行文件
│   └── www                                 -- 项目启动入口
├── config                              -- 配置目录
│   ├── config.js                           -- 项目配置
│   ├── config.js.back                      -- 项目配置备份
│   ├── db.config.js                        -- 数据库配置
│   └── db.config.js.back                   -- 数据库配置备份
│   └── winston.config.js                   -- winston logger配置文件
├── knexfile.js                         -- knex migration配置文教案
├── log                                 -- 日志目录
│   └── 2016-12-28-results.log              -- 日志文件
├── migrations                          -- migration目录
    ├── mongodb                             -- mongodb migration文件目录
    │   └── 1484661520309-add_clazz.js
    └── mysql                               -- mysql migration文件目录
        └── 20170109151307_create_user.js
├── package.json
├── readme.md
└── service_modules                     -- 项目开发目录
    ├── apis                                -- controller层
    │   ├── h5.router.js                       -- 路由配置文件
    │   ├── render                              -- 返回数据结构相关目录
    │   │   ├── api.error.handler.js                -- 基本的错误处理工具
    │   │   ├── api.render.js                       -- 返回数据render方法
    │   │   └── api.result.js                       -- 返回数据结构
    │   ├── schema                              -- 接收数据结构相关目录
    │   │   ├── schema.validator.js                 -- 校验工具
    │   │   └── user.schema.js                      -- api接收数据结构定义
    │   └── web                                 -- web模块controller方法
    │       ├── account.controller.js               -- 用户登录/权限相关api
    │       └── clazz.controller.js                 -- 课程相关api
    ├── dao                                     -- dao层，数据库连接/数据模型，统一向service层提供promise方法
    │   ├── mongo.connection.js                 -- mongodb数据库连接定义
    │   ├── mongo.plugin.js                     -- mongoose plugin定义，用于定义mongopse model上的公共方法
    │   ├── mongodb_mapper                      -- mongoose mapper定义
    │   │   ├── clazz.mapper.js
    │   │   └── schema                              -- mongoose schema定义
    │   │       └── clazz.schema.js
    │   ├── mysql.connection.js                 -- mysql数据库连接定义
    │   └── mysql_mapper                        -- mysql mapper定义
    │       ├── schema                              -- mysql schema定义
    │       │   └── user.schema.js
    │       └── user.mapper.js
    └── services                            -- service层，统一向controller层提供promise方法
        ├── clazz.service.js
        ├── model                               -- model类，供service层及以上层使用
        │   ├── common.error.js                     -- 常用错误
        │   ├── enum.js                             -- 枚举类
        │   └── system.result.js                    -- 返回数据格式
        └── util                                -- 工具类，定义常用无数据依赖的工具方法
            └── clazz.util.js
```

## API文档
api文档采用raml编写，版本1.0。教程请参见参考[资料10]((https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md)及[资料11](RAML - 写项目文档也能有快感](http://blog.guoyiliang.com/2015/04/23/raml-init/)

* 编译已完成的raml文档
```
npm run raml2html doc/h5-api.raml
```

* 导出已完成的raml文档
```
npm run -s raml2html doc/h5-api.raml > doc/h5-api.html
```

## 数据库Migration
使用[knex](https://github.com/tgriesser/knex)来进行mysql数据库的migration
使用[migrate-mongoose](https://github.com/balmasi/migrate-mongoose)来进行mongodb的migration

### knex migration
knex migration默认采用项目根目录下的`knexfile.js`作为其配置文件

* 创建migration
```
npm run knex migrate:make migration_name
```
该命令会在migrations/mysql目录下创建一个如`20161227161645_migartion_name.js`的文件，文件形如
```
exports.up = function(knex, Promise) {
// 此处为migration操作
};

exports.down = function(knex, Promise) {
// 此处为rollback操作
};
```

其中`up`和`down`分别对应执行`migration`和`rollback`将执行的动作

* 执行migration
```
npm run knex migrate:latest
```

* 回退migration
```
npm run knex migrate:rollback
```

### migrate-mongoose
migrate-mongoose使用项目根目录下的mongoose.migrate.json作为其配置文件
备注：因mongoose对schema要求并不是很严格，所以这里仅处理特别情况，如更改枚举名，更改field拼写

* 创建migration
```
npm run mongoose create migraton_name
```
该命令会在migrations/mongodb目录下创建一个如`1484661520309-add_clazz.js`的文件
```
/**
 * Make any changes you need to make to the database here
 */
export async function up () {
  // Write migration here
  await this('Clazz').updateMany({}, { $set: { status: 'CLOSED' } });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
export async function down () {
  // Write migration here
  await this('Clazz').updateMany({}, { $unset: { status: 1 } });
}
```

* 执行migration
```
npm run mongoose up [migraton_name]
```

* 回退migration
```
npm run mongoose down migraton_name
```

## 线上运行
1. 拉取项目
```
git clone git@github.com:guoylyy/shark-api.git
```
2. 进入项目目录 &  安装依赖
```
cd shark-api && npm install
```

3. 配置`config/db.config.js`，参照`config/db.config.js.back`
4. 修改`config/config.js`中的配置信息, 参照`config/config.js.back`
5. 数据库migration `npm run knex migrate:latest`
6. 使用pm2运行
```
// 注意：在项目目录下执行
// cd shark-api

// -i       开启cluster模式， max为cpu最大数量
// --watch  开启监控模式，当文件改变时重启
// --name   为app命名
NODE_ENV=production pm2 start ./bin/www -i max --watch --name 'shark-api'

// 保存信息
pm2 save

// 开机自动启动
pm2 startup

// 查看日志, 日志存放目录为当前用户的`~/.pm2/logs/`目录下
// 如需定制日志地址，在pm2 start命令中使用`-l --log [path]`进行定制
pm2 logs

// 监控
pm2 monit
```

### 线上更新 & 重启
1. 使用脚本拉取更新
2. 数据库migration `npm run knex migrate:latest`
3. 重启server `pm2 restart [app name]`

注：
* 重启时可以只重启单个服务进程 `pm2 restart [app id]`，其中`app id`可以通过`pm2 status`命令查看
* 安装依赖过程中可能由于系统中`gcc`版本过低导致`bcrypt`安装失败，可按下面的步骤安装`gcc 4.8`后，重新执行`npm i`
```
wget http://people.centos.org/tru/devtools-2/devtools-2.repo -O /etc/yum.repos.d/devtools-2.repo

yum install devtoolset-2-gcc devtoolset-2-binutils devtoolset-2-gcc-c++ GraphicsMagick ImageMagick ghostscript -y

// 临时编译前使用
export CC=/opt/rh/devtoolset-2/root/usr/bin/gcc
export CPP=/opt/rh/devtoolset-2/root/usr/bin/cpp
export CXX=/opt/rh/devtoolset-2/root/usr/bin/c++

// 以下为替换系统GCC，不建议这样操作
ln -s /opt/rh/devtoolset-2/root/usr/bin/* /usr/local/bin/
hash -r

// 检查gcc 版本
gcc --version
```

## 开发

* 在项目根目录下执行，安装依赖包
```
npm install
```

* 参数配置
    1. 配置config/db.config.js，参照config/db.config.js.back
    2. 修改config/config.js中的配置信息, 参照config/config.js.back
    3. 配置mongoose.migrate.json，参考mongoose.migrate.json.back；注意：其中dbConnectionUri请与config/db.config.js中的exports.mongodb.uri保持一致

* 开发运行，使用nodemon对文件进行监控
```
npm run dev
```


### 开发规范
* 使用严格模式
* 写好注释，文件开头注释文件整体功能，方法开头注释方法信息
* 调试，使用debug

```
// 其中controller为debug命名空间，现支持app,controller,service,mapper，可以在package.json中设置DEBUG进行控制
const debug = require('debug')('controller');

debug('debug info');
```

示例：
```
'use strict';

/**
 * user数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */

let _ = require('lodash');
let debug = require('debug')('mapper');

let userSchema = require('./schema/user.schema');

let pub = {};

/**
 * 根据用户名获取用户信息
 * @param username
 * @returns {Promise}
 */
pub.findByUsername = (username) => {
  return new Promise((resolve, reject) => {
    userSchema.where({ username: username })
        .fetch()
        .then((userItem) => {
              if (!userItem) {
                return resolve(null);
              }

              return resolve(userItem.toJSON());
            },
            reject
        ).catch(reject);
  });
};

module.exports = pub;

```

### controller demo
```
javascript
pub.drawCLazzCheckins = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
      })
      .catch(req.__ERROR_HANDLER);
};
```

## 缓存相关
1. 使用[node cache manager](https://github.com/BryanDonovan/node-cache-manager)和[node cache manager ioredis](https://github.com/dabroek/node-cache-manager-ioredis)对[ioredis](https://github.com/luin/ioredis)进行封装
2. 仅对数据id进行缓存

## 参考资源
1. [knex 开发文档](http://knexjs.org)
2. [Json Web Token](https://github.com/auth0/node-jsonwebtoken)
3. [Joi validator](https://github.com/hapijs/joi)
4. [mysql2](https://github.com/sidorares/node-mysql2)
5. [awesome node](https://github.com/sindresorhus/awesome-nodejs)
6. [mongoose](https://github.com/Automattic/mongoose)
7. [pm2 文档](http://pm2.keymetrics.io/docs/usage/cluster-mode/)
8. [winston日志](https://github.com/winstonjs/winston)
9. [JavaScript Promise迷你书（中文版）](https://www.gitbook.com/book/wohugb/promise/details)
10. [官方教程](https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md)
11. [RAML - 写项目文档也能有快感](http://blog.guoyiliang.com/2015/04/23/raml-init/)

## 疑难杂症
1. [mongoose collection pluralize](http://mongoosejs.com/docs/guide.html#collection)

## Node相关
1. [Promise Anti-patterns](http://bluebirdjs.com/docs/anti-patterns.html)
2. [10 个技巧，2017 年成为更好的 Node 开发者](https://www.oschina.net/translate/10-tips-to-become-a-better-node-developer)

