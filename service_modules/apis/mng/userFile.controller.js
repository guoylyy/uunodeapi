'use strict';

/**
 * 用户文件管理API
 *
 */
const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');
const moment = require('moment');

const apiRender = require('../render/api.render');
const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const commonError = require('../../services/model/common.error');
const enumModel = require('../../services/model/enum');

const userFileService = require('../../services/userFile.service');
const attachService = require('../../services/attach.service');

const qiniuComponent = require('../../services/component/qiniu.component');
const commonUtil = require('../../services/util/common.util');
const fileUtil = require('../../services/util/file.util');
const wechatFile = require('../../lib/wechat.multimedia.file');

const AMR_POSTFIX = '.amr';
const MP3_POSTFIX = '.mp3';
const MP3_MIME_TYPE = 'audio/mpeg3';

const pub = {};

/**
 * 同步微信文件到七牛云附件
 *
 * @param req
 * @param res
 * @returns {*}
 */
pub.downloadFromWechat = (req, res) => {
  return void schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((requestBody) => {
        debug(requestBody);

        const userFileId = req.params.userFileId;
        debug(userFileId);

        req.__MODULE_LOGGER('下载用户打卡文件', userFileId);

        return Promise.all([
          // 获取文件
          userFileService.fetchUserFileById(userFileId),
          // 获取文件url生成函数
          wechatFile.fetchWechatFileUrlFunction()
        ])
      })
      .then((results) => {
        debug(results);

        const userFileItem = results[0],
            wechatFileUrlFunction = results[1];

        // 判断文件是否需要下载
        if (fileUtil.isUserFileNeedDownload(userFileItem) !== true) {
          return Promise.reject(commonError.PARAMETER_ERROR('该文件无需再次下载'));
        }

        const isAmrFile = userFileItem.format === 'amr',
            fileNamePrefix = userFileItem.fileName || commonUtil.generateRandomKey();

        const wechatFileUrl = wechatFileUrlFunction(userFileItem.fileKey),  // 获取文件url
            // 文件名
            fileName = isAmrFile === true
                ? `${ fileNamePrefix }${ AMR_POSTFIX }`
                : fileNamePrefix,
            attachType = enumModel.qiniuFileTypeEnum.PUBLIC.key,  // 附件类型
            userFileType = userFileItem.fileType, // 文件类型
            // 如果为amr文件才转换
            targetFileName = isAmrFile === true
                ? `${ fileNamePrefix }${ MP3_POSTFIX }`
                : fileNamePrefix;

        debug(wechatFileUrl);
        debug(fileName);
        debug(attachType);
        debug(userFileType);

        // 七牛云key标识
        const attachFileKey = _.now() + '_' + commonUtil.generateRandomString(7) + '_' + fileName;

        debug(attachFileKey);

        // 下载文件到本地
        return fileUtil.downloadFileInTmp(wechatFileUrl, fileName)
            .then((outputFilePath) => {
              debug(outputFilePath);
              return isAmrFile === true
                  ? fileUtil.amrHandler(fileName, targetFileName)
                  : outputFilePath;
            })
            .then((filePath) => {
              debug(filePath);

              // 上传到七牛云
              return qiniuComponent.uploadFilePromise(attachType, attachFileKey, userFileType, filePath);
            })
            .then((qiniuFile) => {
              debug(qiniuFile);

              // 附件item
              const attachItem = {
                name: targetFileName,
                key: attachFileKey,
                attachType: attachType,
                fileType: userFileType
              };

              if (isAmrFile === true) {
                attachItem.mimeType = MP3_MIME_TYPE;
              }

              // 保存Attach
              return attachService.createAttach(attachItem);
            })
            .then((attachItem) => {
              debug(attachItem);

              // 更新用户文件
              return userFileService.updateUserFileItem(
                  userFileItem.id,
                  {
                    fileUrl: attachItem.url,
                    fileName: '微信' + _.get(enumModel.getEnumByKey(userFileType, enumModel.fileTypeEnum), 'name', '文件'),
                    attach: attachItem.id
                  });
            });
      })
      .then((updatedUserFile) => {
        debug(updatedUserFile);

        // 过滤信息
        const pickedUserFile = _.pick(updatedUserFile, ['id', 'fileName', 'fileKey', 'fileUrl', 'fileType', 'upTime']);

        return apiRender.renderBaseResult(res, pickedUserFile);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
