'use strict';

const _ = require('lodash');
const debug = require('debug')('util');
const Promise = require('bluebird');

const htmlparser = require("htmlparser2");

const extraTags = ['audio', 'video', 'img'];
const newLineTags = ['section', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

const pub = {};

/**
 * 清除html标签中的class及style
 *
 * @param nodeElement
 */
pub.clearNodeClazzAndStyle = (nodeElement) => {
  return nodeElement;//nodeElement.replace(/class\s*=\s*"[^"]*"/g, "").replace(/style\s*=\s*"[^"]*"/g, "");
};

/**
 * 将html内容转化为数组
 *
 * @param html
 */
pub.parseHtmlToListPromise = (html) => {
  const appendTrimmedContent = (content, list) => {
    const trimmedContent = _.trim(content);

    if (!_.isEmpty(trimmedContent)) {
      list.push(trimmedContent);
    }
  };

  return new Promise((resolve) => {
    const list = [];

    let isNewLine = false,
        tagStartIndex = 0,
        tagEndIndex = 0,
        currentLine = "";

    const parseHandler = {
      onopentag: function (name) {
        debug(name);
        let isExtraTag = _.includes(extraTags, name);
        isNewLine = isExtraTag || _.includes(newLineTags, name);

        if (isExtraTag) {
          // 标记tag开始
          tagStartIndex = this.parser.startIndex;
        }
      },
      ontext: function (text) {
        debug(isNewLine);
        debug(currentLine);
        debug(text);

        if (isNewLine === true) {
          appendTrimmedContent(currentLine, list);
          appendTrimmedContent(text, list);

          currentLine = "";
        } else {
          currentLine += text;
        }
      },
      onclosetag: function (name) {
        // 处理额外标签
        let isExtraTag = _.includes(extraTags, name);
        if (isExtraTag) {
          // 标记tag结束
          tagEndIndex = this.parser.endIndex + 1;

          // 获取从tag中的完整内容
          const closedHtmlEntity = html.substring(tagStartIndex, tagEndIndex);

          if (!_.isEmpty(closedHtmlEntity)) {
            list.push(pub.clearNodeClazzAndStyle(closedHtmlEntity));
          }
        }

        // 处理需换行的标签
        let isNewLineTag = _.includes(newLineTags, name);
        if (isNewLineTag) {
          appendTrimmedContent(currentLine, list);

          currentLine = "";
        }
      },
      onend: () => {
        // 如果还有未处理的数据，则插入到队尾
        appendTrimmedContent(currentLine, list);

        return resolve(list);
      }
    };
    const parser = new htmlparser.Parser(
        parseHandler,
        { decodeEntities: true }
    );
    parseHandler.parser = parser;

    parser.write(html);

    parser.end();
  });
};

/**
 * 从task文本中抽取素材id列表
 *
 * @param taskItem
 * @returns {Promise|Promise.<Array>}
 */
pub.extractTaskMaterialList = (taskItem) => {
  const extractDataIdPromiseList = _.map(
      taskItem.introductions,
      (introductionItem) => {
        return new Promise((resolve) => {
          const idList = [];

          const parseHandler = {
            onopentag: (name, attributes) => {
              debug(name);
              debug(attributes);
              if (_.includes(extraTags, name)) {
                const id = attributes['data-material-id'];
                if (!_.isNil(id)) {
                  idList.push(id);
                }
              }
            },
            onend: () => {
              debug(idList);
              return resolve(idList);
            }
          };
          const parser = new htmlparser.Parser(
              parseHandler,
              { decodeEntities: true }
          );
          parseHandler.parser = parser;

          parser.write(introductionItem.content);

          parser.end();
        })
      });

  return Promise.all(extractDataIdPromiseList)
      .then((idsList) => _.flatten(idsList));
};

module.exports = pub;
