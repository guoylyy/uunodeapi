'use strict';

const xml2js = require('xml2js');

let pub = {};

/**
 * 微信xml解析器
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
pub.wechatXmlParser = (req, res, next) => {
  if (req._body) {
    return next();
  }

  req.body = req.body || {};

  // ignore GET
  if ('GET' == req.method || 'HEAD' == req.method) {
    return next();
  }

  // flag as parsed
  req._body = true;
  req.setEncoding('utf8');

  // parse
  let buf = '';
  req.on('data', (chunk) => {
    buf += chunk;
  });

  req.on('end', () => {
    xml2js.parseString(buf, (err, json) => {
      if (err) {
        err.status = 400;
        next(err);
      } else {
        req.body = json;
        next();
      }
    });
  });
};

module.exports = pub;
