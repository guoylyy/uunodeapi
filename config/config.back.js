'use strict';
const fs = require('fs');

/***********************************************************************************************************************
 *
 *                                          域名及七牛回调地址   配置
 *
 ***********************************************************************************************************************/

/**
 * 微信H5 BASE_URL
 * @type {string}
 */
exports.BASE_URL = 'http://h5test.gambition.cn';

/**
 * 微信H5，七牛回调地址
 * @type {string}
 */
exports.BASE_QINIU_CALLBACK_URL = exports.BASE_URL + '/api/qiniu/callback';

/**
 * 网页端，BASE_URL
 * @type {string}
 */
exports.WEB_BASE_URL = 'http://webtest.gambition.cn';

/**
 * 网页端，七牛回调地址
 * @type {string}
 */
exports.WEB_BASE_QINIU_CALLBACK_URL = exports.WEB_BASE_URL + '/api/qiniu/callback';

/**
 * mng端，BASE_URL
 * @type {string}
 */
exports.MNG_BASE_URL = 'http://nmng.gambition.cn';

/**
 * mng端，七牛回调地址
 * @type {string}
 */
exports.MNG_BASE_QINIU_CALLBACK_URL = exports.MNG_BASE_URL + '/api/qiniu/callback';

/**
 * 笃师一对一app端，七牛回调地址
 * @type {string}
 */
exports.ONE_BASE_QINIU_CALLBACK_URL = 'http://teacherapp.gambition.cn/api/qiniu/callback';

// todo 修改为线上环境
/**
 * 笃师一对一app端，七牛回调地址
 * @type {string}
 */
exports.WEBAPP_ONE_BASE_QINIU_CALLBACK_URL = 'https://program.gambition.cn/weapp/qiniu/callback';

/***********************************************************************************************************************
 *
 *                                         系统模块   配置
 *
 ***********************************************************************************************************************/


/**
 * 系统模块配置
 * @type {{mngModule: {isOpen: boolean}}}
 */
exports.MODULE_OPTIONS = {
    adminModule: {
        isOpen: true
    },
    mngModule: {
        isOpen: true
    },
    weh5APIModule: {
        isOpen: true
    },
    webApiModule: {
        isOpen: false
    },
    cronModule: {
        isOpen: false
    },
    one2oneModule: {
        isOpen: false
    },
    weappOneModule: {
        isOpen: true
    },
    appSharkModule:{
        isOpen: true
    }
};

/***********************************************************************************************************************
 *
 *                                         JSON WEB TOKEN   配置
 *
 ***********************************************************************************************************************/

/**
 * JSON H5 TOKEN 全局配置
 * @type {{secretKey: string, options: {algorithm: string, expiresIn: string}}}
 */
exports.jwt = {
    secretKey: 'secretKey',
    options: {
        algorithm: 'HS512',
        expiresIn: '7d'  // expires in 7 days
    }
};

/**
 * JSON WEB TOKEN 全局配置
 * @type {{secretKey: string, options: {algorithm: string, expiresIn: string}}}
 */
exports.jwt_web = {
    secretKey: 'secretKey',
    options: {
        algorithm: 'HS512',
        expiresIn: '7d'  // expires in 7 days
    }
};

/**
 * JSON MNG TOKEN 全局配置
 * @type {{secretKey: string, options: {algorithm: string, expiresIn: string}}}
 */
exports.jwt_mng = {
    secretKey: 'secretKey',
    options: {
        algorithm: 'HS512',
        expiresIn: '7d'  // expires in 7 days
    }
};

/**
 * JSON ONE TOKEN 全局配置
 * @type {{secretKey: string, options: {algorithm: string, expiresIn: string}}}
 */
exports.jwt_one = {
    secretKey: 'secretKey',
    options: {
        algorithm: 'HS512',
        expiresIn: '7d'  // expires in 7 days
    }
};

/**
 * JSON ADMIN TOKEN 全局配置
 * @type {{secretKey: string, options: {algorithm: string, expiresIn: string}}}
 */
exports.jwt_admin = {
    secretKey: 'secretKey',
    options: {
        algorithm: 'HS512',
        expiresIn: '7d'  // expires in 7 days
    }
};

/**
 * JSON wechat app one TOKEN 全局配置
 * @type {{secretKey: string, options: {algorithm: string, expiresIn: string}}}
 */
exports.jwt_weapp_one = {
    secretKey: '1fb9aa3b3f55dd9e22b7480e5c7dd666',
    options: {
        algorithm: 'HS512',
        expiresIn: '7d'  // expires in 7 days
    }
};

/**
 * JSON app shark TOKEN 全局配置
 * @type {{secretKey: string, options: {algorithm: string, expiresIn: string}}}
 */
exports.jwt_app_shark = {
    secretKey: 'U!Cn7A&Km674Vk9EAG283NptPxj!quQ',
    options: {
        algorithm: 'HS512',
        expiresIn: '1d'  // expires in 7 days
    }
};


/***********************************************************************************************************************
 *
 *                                          七牛云  配置
 *
 ***********************************************************************************************************************/

/**
 * 七牛云配置
 * @type {{SECRET: {ACCESS_KEY: string, SECRET_KEY: string, DOMAIN_URL: string, BUCKET: string, IS_PUBLIC: boolean, CALLBACK_URL: string}, PUBLIC: {ACCESS_KEY: string, SECRET_KEY: string, DOMAIN_URL: string, BUCKET: string, IS_PUBLIC: boolean, CALLBACK_URL: string}, CHECKIN_REPOSITORY: {ACCESS_KEY: string, SECRET_KEY: string, DOMAIN_URL: string, BUCKET: string, IS_PUBLIC: boolean, CALLBACK_URL: string}}}
 */
exports.QINIU_OPTIONS = {
    SECRET: {
        ACCESS_KEY: '',
        SECRET_KEY: '',
        DOMAIN_URL: '',
        BUCKET: '',
        IS_PUBLIC: true
    },
    PUBLIC: {
        ACCESS_KEY: '',
        SECRET_KEY: '',
        DOMAIN_URL: '',
        BUCKET: '',
        IS_PUBLIC: true
    },
    CHECKIN_REPOSITORY: {
        ACCESS_KEY: '',
        SECRET_KEY: '',
        DOMAIN_URL: '',
        BUCKET: '',
        IS_PUBLIC: true
    }
};

/***********************************************************************************************************************
 *
 *                                      第三方应用 环信 配置
 *
 ***********************************************************************************************************************/

exports.EASEMOB = {
    'WEAPP_ONE': {  // 微信小程序 - 一对一
        'ORG_NAME': 'ORG_NAME',
        'APP_NAME': 'APP_NAME',
        'APP_KEY': 'APP_KEY#uband',
        'CLIENT_ID': 'CLIENT_ID',
        'CLIENT_SECRET': 'CLIENT_SECRET',
        'HOST': 'HOST',
        'SALT_ROUNDS': 1 // 默认加盐哈希次数
    }
};

/***********************************************************************************************************************
 *
 *                                          密码加密相关  配置
 *
 ***********************************************************************************************************************/

/**
 * 用户相关设置
 *
 * @type {{saltRounds: number}}
 */
exports.USER_OPTIONS = {
    saltRounds: 13 // 默认加盐哈希次数
};

/***********************************************************************************************************************
 *
 *                                            微信APP  配置
 *
 ***********************************************************************************************************************/

/**
 * 微信H5配置
 *
 * @type {{APP_ID: string, SECRET: string}}
 */
exports.WECHAT_APP_CONFIG = {
    'APP_ID': 'wx5480cf8884bf2328',
    'SECRET': '8ff0b1565dd8be1ce85dd9940adf2574',
    'TOKEN': 'weixin'
};

/**
 * 微信APP退款配置
 *
 * @type {{appId: string, mchId: string, checkNameOption: string, spBillCreateIp: string, APISecretKey: string, cert: null, cert_key: null}}
 */
exports.WECHAT_APP_WITHDRAW_CONFIG = {
    appId: exports.WECHAT_APP_CONFIG.APP_ID,  // 公众账号appid
    mchId: "mchId",                           // 商户号
    checkNameOption: "checkNameOption",       // 校验用户姓名选项
    spBillCreateIp: "spBillCreateIp",         // Ip地址
    APISecretKey: "APISecretKey",             // API密钥
    maxWithdrawMoney: 500,                    // 最大退款金额, 单位元
    cert: null,                               // pem证书文件
    cert_key: null                            // pem证书密钥文件
};

// 密钥文件路径配置
const certFilePath = '',
    certKeyFilePath = '';
/**
 * 网页微信配置
 *
 * @type {{}}
 */
exports.WECHAT_WEB_CONFIG = {
    'APP_ID': 'wx5480cf8884bf2328',
    'SECRET': '8ff0b1565dd8be1ce85dd9940adf2574'
};

/**
 * 笃师一对一微信APP配置
 *
 * @type {{}}
 */
exports.WECHAT_ONE_CONFIG = {
    'APP_ID': 'appId',
    'SECRET': 'secret'
};

/**
 * 微信小程序 笃师一对一 配置
 * @type {{APP_ID: string, SECRET: string}}
 */
exports.WEAPP_ONE_CONFIG = {
    'APP_ID': 'wxcd313169bc34a283',
    'SECRET': '8d17154fabed014e9de83cb09e9b3438',
    'CLAZZ_ID': '592fec78f0582f3dc300ed5b'
};

/***********************************************************************************************************************
 *
 *                                          链接打卡  配置
 *
 ***********************************************************************************************************************/

/**
 * 链接打卡支持
 * @type {{url: {name: string, key: string, type: string, format: string}}}
 */
exports.CHECKIN_SUPPORT_DOMAIN = {
    'openspeech.cn/recinboxaudio': {
        name: '录音宝',
        key: 'openspeech.cn/recinboxaudio',
        type: 'voice',
        format: 'mp3'
    },
    'lizhi.fm/podcast': {
        name: '荔枝fm',
        key: 'lizhi.fm/podcast',
        type: 'voice',
        format: 'mp3'
    },
    'www.zybuluo.com': {
        name: '作业部落',
        key: 'www.zybuluo.com',
        type: 'voice',
        format: 'mp3'
    },
    'www.jianshu.com/p': {
        name: '简书',
        key: 'www.jianshu.com/p',
        type: 'voice',
        format: 'mp3'
    },
    'qiniucheckin.gambition.cn': {
        name: 'App七牛文件库',
        key: 'qiniucheckin.gambition.cn',
        type: 'voice',
        format: 'mp3'
    }
};

/***********************************************************************************************************************
 *
 *                                          定时任务相关  配置
 *
 ***********************************************************************************************************************/

exports.CRON_CONFIG = {
    STUDENT_NUMBER_GENERATOR_CLAZZ_LIST: [
        '584bbb8f2f301e005724eb38' // 免力再教育美音班
    ],
    UNCHECKIN_ALERT_CLAZZ_LIST: [
        '584bbb8f2f301e005724eb38' // 免力再教育美音班
    ]
};


/***********************************************************************************************************************
 *
 *                                            Jpush配置
 *
 ***********************************************************************************************************************/
exports.JPUSH_SDK_CONFIG = {
    APP_KEY: '0ec6605849d3e21056365c191',          // 开发者 AppKey，可从 JPush Portal 获取
    MASTER_SECRET: 'e95c347412ba593ced883cd111',    // 开发者 masterSecret，可从 JPush Portal 获取
    RETRY_TIMES: 3                                // 请求失败重试次数
};
