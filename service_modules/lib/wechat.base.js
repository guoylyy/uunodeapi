'use strict';

/**
 * 微信基本工具类
 */
const _ = require('lodash');
const parseString = require('xml2js').parseString;
const Promise = require('bluebird');
const debug = require('debug')('lib');

let pub = {};

/**
 * 对参数按照key=value的格式，并按照参数名ASCII字典序排序如下：
 *
 * 特别注意以下重要规则：
 ◆ 参数名ASCII码从小到大排序（字典序）；
 ◆ 如果参数的值为空不参与签名；
 ◆ 参数名区分大小写；
 ◆ 验证调用返回或微信主动通知签名时，传送的sign参数不参与签名，将生成的签名与该sign值作校验。
 ◆ 微信接口可能增加字段，验证签名时必须支持增加的扩展字段
 *
 * @param object
 * @returns {string}
 */
pub.rawString = (object) => {
  return _.chain(object)
      .keys()
      .sort()
      .map((key) => key + '=' + object[key])
      .join('&')
      .value();
};

/**
 * 从xml中获取node的值
 *
 * @param nodeName
 * @param xml
 * @returns {*}
 */
pub.getXMLNodeValue = (nodeName, xml) => {
  let tmp = _.split(xml, "<" + nodeName + ">")
  let _tmp = _.split(tmp[1], "</" + nodeName + ">");

  return _tmp[0];
};


const parseStringPromise = Promise.promisify(parseString);
/**
 * 将微信接口返回的xml数据转换成js对象
 *
 * @param responseBodyStr
 * @returns {Promise|*|Promise.<TResult>}
 */
pub.parseWechatResponseBody = (responseBodyStr) => {
  return parseStringPromise(responseBodyStr)
      .then((xmlBody) => {
        debug(xmlBody);

        return _.reduce(
            xmlBody.xml,
            (jsonBody, value, key) => {
              debug(value);

              jsonBody[key] = value[0];
              return jsonBody;
            },
            {}
        );
      });
};

module.exports = pub;
