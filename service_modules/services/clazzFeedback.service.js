'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const winston = require('winston');
const debug = require('debug')('service');
const uuidV4 = require('uuid/v4');

const commonError = require('./model/common.error');
const enumModel = require('./model/enum');

const commonUtil = require('./util/common.util');
const clazzUtil = require('./util/clazz.util');
const fileUtil = require('./util/file.util');

const qiniuComponent = require('./component/qiniu.component');

const wechatMedida = require('../lib/wechat.media');

const userService = require('./user.service');
const clazzAccountService = require('./clazzAccount.service');
const attachService = require('./attach.service');

const clazzFeedbackMapper = require('../dao/mongodb_mapper/clazzFeedback.mapper');
const clazzFeedbackReplyMapper = require('../dao/mongodb_mapper/clazzFeedbackReply.mapper');
const clazzFeedbackMaterialMapper = require('../dao/mongodb_mapper/clazzFeedbackMaterial.mapper');
const adminMapper = require('../dao/mysql_mapper/admin.mapper');

const wechatTemplateReply = require('../lib/wechat.template.reply');

/**
 * 生成返回的消息条目
 *
 * @param replyItem
 * @param userInfo
 * @param attachItem
 * @param materialItem
 * @returns {Object}
 */
const pickReplyItem = (replyItem, userInfo, attachItem, materialItem) => {
  debug(replyItem);
  debug(userInfo);
  debug(attachItem);
  debug(materialItem);

  return {
    // 通用类型字段
    id: replyItem.id,
    userInfo: userInfo,
    type: replyItem.replyType,
    date: replyItem.createdAt,
    // 文本类型字段
    content: replyItem.content || null,
    // 语音类型字段
    url: _.get(attachItem, 'url', null),
    // 素材类型字段
    author: _.get(materialItem, 'author', null),
    title: _.get(materialItem, 'title', null),
    materialId: replyItem.feedbackMaterial || null,
  };
};

/**
 * 摘选个人信息
 *
 * @param userItem
 */
const extractedUserInfo = (userItem) => {
  return _.pick(userItem, ['id', 'name', 'headImgUrl']);
};

const AMR_POSTFIX = '.amr';
const MP3_POSTFIX = '.mp3';
const MP3_MIME_TYPE = 'audio/mpeg3';

/**
 * 处理微信语音消息
 *
 * @param mediaId
 * @param attachType
 * @param fileType
 */
const digestWechatMedia = (mediaId, attachType, fileType) => {
  let fileName = uuidV4();
  let amrFileName = fileName + AMR_POSTFIX,
      mp3FileName = fileName + MP3_POSTFIX,
      key = _.now() + '_' + commonUtil.generateRandomString(6) + '_' + mp3FileName;
  debug(amrFileName);
  debug(mp3FileName);
  debug(key);

  return wechatMedida.fetchMediaUrl(mediaId)
      .then((mediaUrl) => {
        debug(mediaUrl);
        return fileUtil.downloadFileInTmp(mediaUrl, amrFileName);
      })
      .then((outputFilePath) => {
        debug(outputFilePath);
        return fileUtil.amrHandler(amrFileName, mp3FileName);
      })
      .then((outputFilePath) => {
        debug(outputFilePath);
        return qiniuComponent.uploadFilePromise(attachType, key, fileType, outputFilePath);
      })
      .then(() => {
        let attachItem = {
          name: mp3FileName,
          key: key,
          attachType: attachType,
          fileType: fileType,
          mimeType: MP3_MIME_TYPE
        };

        return attachService.createAttach(attachItem);
      })
      .catch((error) => {
        winston.error(error);

        return Promise.reject(commonError.BIZ_FAIL_ERROR('语音上传失败'));
      });
};

let pub = {};

// 学员加入成功状态数组
const joinedClazzAccountStatusList = [enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.CLOSE.key];
/**
 * 分页获取笃师一对一反馈列表
 *
 * @param clazzId
 * @param pageNumber
 * @param pageSize
 * @param status
 * @param keyWord
 * @returns {Promise|Promise.<*>}
 */
pub.queryPagedFeedbacks = (clazzId, pageNumber, pageSize, status, keyWord) => {
  if (_.isNil(clazzId) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error(
        '分页获取笃师一对一反馈列表失败，参数错误！！！\n\tclazzId: %s\n\tpageNumber: %s\n\tpageSize: %s\n\tstatus: %s\n\tkeyWord: %s',
        clazzId,
        pageNumber,
        pageSize,
        status,
        keyWord
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 根据查询关键词构建用户查询
  const queryUserPromise = (_.isNil(keyWord))
      ? Promise.resolve(null)
      : clazzAccountService.searchClazzUsers(clazzId, joinedClazzAccountStatusList, keyWord, []);

  let globalUserList,       // 记录用户列表
      globalFeedbackResult; // 记录反馈记录结果
  return queryUserPromise.then(
      (userList) => {
        globalUserList = userList;
        debug(userList);

        const queryParam = { clazz: clazzId };
        if (!_.isNil(status)) {
          queryParam.status = status;
        }
        if (!_.isNil(keyWord)) {
          const userIds = _.map(userList, 'id');
          debug(userIds);
          queryParam.userId = userIds;
        }

        return clazzFeedbackMapper.pagedQuery(queryParam, pageNumber, pageSize);
      })
      .then((feedbackResult) => {
        globalFeedbackResult = feedbackResult;
        debug(feedbackResult);

        if (_.isNil(keyWord)) {
          const userIds = _.map(feedbackResult.values, 'userId');
          debug(userIds);
          return userService.queryUser(null, userIds);
        }

        return Promise.resolve(globalUserList);
      })
      .then((userList) => {
        const userMap = _.keyBy(userList, 'id');

        globalFeedbackResult.values = _.map(globalFeedbackResult.values, (feedback) => {
          feedback.user = userMap[feedback.userId];

          return _.omit(feedback, 'userId', 'user.openId', 'user.clazzAccount');
        });

        return globalFeedbackResult;
      });
};

/**
 * 根据id获取反馈item
 *
 * @param feedbackId
 * @returns {*}
 */
pub.fetchFeedbackById = (feedbackId) => {
  if (_.isNil(feedbackId)) {
    winston.error('获取课程反馈条目失败，参数错误！！！feedbackId: %s', feedbackId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMapper.fetchById(feedbackId);
};

/**
 * 根据用户id和班级id获取反馈item
 *
 * @param clazzId
 * @param userId
 * @returns {*}
 */
pub.fetchClazzFeedbackByUserId = (clazzId, userId) => {
  if (_.isNil(clazzId) || _.isNil(userId)) {
    winston.error('获取课程反馈条目失败，参数错误！！！clazzId: %s, userId: %s', clazzId, userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMapper.query({ clazz: clazzId, userId: userId })
      .then((feedbackList) => {
        // 如果反馈条目不存在，则新建
        if (_.isEmpty(feedbackList)) {
          const feedbackItem = {
            clazz: clazzId,
            userId: userId,
            status: enumModel.clazzFeedbackStatusEnum.SUBMITTING.key,
            feedbackRound: 0
          };

          return clazzFeedbackMapper.create(feedbackItem);
        }

        // 如果有多个，则打印错误消息，并返回第一个
        if (feedbackList.length > 1) {
          winston.error('配置错误！！！用户%d在班级%s存在多条反馈记录: %j', userId, clazzId, _.map(feedbackList, 'id'));
        }

        return feedbackList[0];
      })
      .then((feedbackItem) => {
        debug(feedbackItem);

        return feedbackItem;
      });
};

/**
 * 查询反馈消息列表
 *
 * @param feedbackItem
 * @param userItem
 * @param clazzItem
 * @param pageSize
 * @param endDate
 * @param isAdmin
 * @param startDate
 * @returns {*}
 */
pub.queryFeedbackReplyList = (feedbackItem, userItem, clazzItem, pageSize = 10, endDate, isAdmin = false, startDate) => {
  if (!_.isPlainObject(feedbackItem)) {
    winston.error('获取课程反馈消息列表失败，参数错误！！！feedbackItem: %j', feedbackItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const queryParam = { clazzFeedback: feedbackItem.id };
  if (_.isDate(endDate)) {
    queryParam.createdAt = { '$lt': endDate };
  }
  if (_.isDate(startDate)) {
    queryParam.createdAt = _.extend(queryParam.createdAt, { '$gt': startDate });
  }


  const globalUserItemId = _.get(userItem, ['id']);
  // 1. 获取消息列表
  return clazzFeedbackReplyMapper.pagedQuery(queryParam, 1, pageSize)
      .then((result) => {
        debug(result);

        const feedbackReplyList = result.values;

        if (_.isEmpty(feedbackReplyList)) {
          return Promise.resolve(result);
        }

        // 2. 获取 用户列表，附件列表，反馈素材列表
        const userIds = [], attachIds = [], materialIds = [], adminIds = [];
        _.forEach(feedbackReplyList, (replyItem) => {
          const { attach, feedbackMaterial, adminId, userId } = replyItem;

          if (!_.isNil(attach)) {
            attachIds.push(attach);
          }
          if (!_.isNil(feedbackMaterial)) {
            materialIds.push(feedbackMaterial);
          }
          if (!_.isNil(userId)) {
            userIds.push(userId);
          }
          if (!_.isNil(adminId)) {
            adminIds.push(adminId);
          }
        });

        debug(userIds);
        debug(attachIds);
        debug(materialIds);
        debug(adminIds);

        const fetchUserListPromise = userService.queryUser(null, userIds),
            fetchAdminListPromise = adminMapper.queryAll({ id: adminIds }),
            fetchAttachListPromise = attachService.queryAttachList(attachIds),
            fetchMaterialListPromise = clazzFeedbackMaterialMapper.query({ '_id': materialIds });

        return Promise.all([fetchUserListPromise, fetchAdminListPromise, fetchAttachListPromise, fetchMaterialListPromise])
            .then(([userList, adminList, attachList, materialList]) => {
              const isClazzTeacher = clazzUtil.checkIsClazzTeacher(clazzItem);
              const userInfoMap = _.reduce(
                  userList,
                  (prev, userItem) => {
                    const userInfoItem = extractedUserInfo(userItem);

                    userInfoItem.isSelf = userItem.id === globalUserItemId;
                    userInfoItem.isTeacher = isClazzTeacher(userItem.openId);

                    prev[userInfoItem.id] = userInfoItem;

                    return prev;
                  },
                  {}
              );

              const adminInfoMap = _.reduce(
                  adminList,
                  (prev, adminItem) => {
                    const userInfoItem = extractedUserInfo(adminItem);

                    userInfoItem.isSelf = isAdmin;
                    userInfoItem.isTeacher = true;

                    prev[userInfoItem.id] = userInfoItem;

                    return prev;
                  },
                  {}
              );


              const attachMap = _.keyBy(attachList, 'id'),
                  materialMap = _.keyBy(materialList, 'id');

              debug(attachMap);
              debug(materialMap);

              // 3. 填充细节信息
              result.values = _.map(
                  _.reverse(feedbackReplyList),
                  (replyItem) => {
                    const attachItem = attachMap[replyItem.attach],
                        materialItem = materialMap[replyItem.feedbackMaterial];

                    const userItem = _.isNil(replyItem.adminId)
                        ? userInfoMap[replyItem.userId]
                        : adminInfoMap[replyItem.adminId];

                    return pickReplyItem(replyItem, userItem, attachItem, materialItem);
                  }
              );

              return result;
            });
      });
};

/**
 * 回复笃师一对一消息
 *
 * @param feedbackItem
 * @param replyItem
 * @param userItem
 * @param isClazzTeacher
 * @param clazzItem
 * @returns {*}
 */
pub.replyFeedback = (feedbackItem, replyItem, userItem, isClazzTeacher, clazzItem) => {
  let newReplyItem = {
    userId: userItem.id,
    clazz: feedbackItem.clazz,
    clazzFeedback: feedbackItem.id,
    replyType: replyItem.replyType
  };

  const clazzFeedbackRound = _.get(clazzItem, 'configuration.feedbackRound', 0), // 班级配置中的反馈轮数
      currentFeedbackRound = _.get(feedbackItem, 'feedbackRound', 0); // 用户当前反馈轮数

  let digestReplyPromise, globalAttachItem, globalMaterialItem,
      isNotifyUser = false,
      updateFeedbackPromise = Promise.resolve(feedbackItem);

  /*
   如果
   1. 为学员
   2. 反馈轮数 < 课程反馈轮数

   则更改状态至待回复
   */
  if (isClazzTeacher !== true && currentFeedbackRound < clazzFeedbackRound) {
    updateFeedbackPromise = clazzFeedbackMapper.updateById(feedbackItem.id, { status: enumModel.clazzFeedbackStatusEnum.WAITING.key })
  }

  // 根据反馈类型，进行参数校验和消息处理
  switch (replyItem.replyType) {
    case enumModel.clazzFeedbackReplyTypeEnum.TEXT.key:
      if (_.isNil(replyItem.content)) {
        return Promise.reject(commonError.PARAMETER_ERROR('消息不能为空'));
      }

      const trimedContent = (replyItem.content || '').trim();
      /*
       如果
       1. 为笃师
       2. 回复内容为 1024

       更改状态为已回复，
       反馈轮数如果不大于班级反馈轮数，则当前反馈书自增，则自增
       */
      if (isClazzTeacher === true && trimedContent === '1024') {
        // 更改状态为已回复，
        let newFeedbackItem = { status: enumModel.clazzFeedbackStatusEnum.REPLIED.key };
        // 如果不大于班级反馈轮数，则当前反馈书自增
        if (currentFeedbackRound < clazzFeedbackRound) {
          newFeedbackItem.feedbackRound = currentFeedbackRound + 1;
        }

        updateFeedbackPromise = clazzFeedbackMapper.updateById(feedbackItem.id, newFeedbackItem);
        // 标记通知用户
        isNotifyUser = true;
      }

      newReplyItem.content = replyItem.content;

      digestReplyPromise = Promise.resolve(newReplyItem);
      break;
    case enumModel.clazzFeedbackReplyTypeEnum.VOICE.key:
      /*
       1. 如果mediaId不为空
       2. 或者 为笃师 且 attachId不为空
       */
      if (_.isNil(replyItem.mediaId) && (isClazzTeacher !== true || _.isNil(replyItem.attachId))) {
        return Promise.reject(commonError.PARAMETER_ERROR('语音文件不能为空'));
      }

      let handleVoicePromise;
      // 处理微信语音
      if (!_.isNil(replyItem.mediaId)) {
        handleVoicePromise = digestWechatMedia(replyItem.mediaId, 'PUBLIC', enumModel.clazzFeedbackReplyTypeEnum.VOICE.key.toLowerCase());
      } else {
        // 处理附件信息
        handleVoicePromise = attachService.fetchAttachById(replyItem.attachId)
            .then((attachItem) => {
              debug(attachItem);

              if (_.isNil(attachItem)) {
                return Promise.reject(commonError.PARAMETER_ERROR());
              }

              return attachItem;
            })
      }

      digestReplyPromise = handleVoicePromise.then(
          (attachItem) => {
            newReplyItem.attach = attachItem.id;
            globalAttachItem = attachItem;

            return newReplyItem;
          });
      break;
    case enumModel.clazzFeedbackReplyTypeEnum.MATERIAL.key:
      if (isClazzTeacher !== true) {
        return Promise.reject(commonError.UNAUTHORIZED_ERROR('学员不能回复素材类型消息'));
      }
      if (_.isNil(replyItem.materialId)) {
        return Promise.reject(commonError.PARAMETER_ERROR('素材不能为空'));
      }

      digestReplyPromise = clazzFeedbackMaterialMapper.fetchById(replyItem.materialId)
          .then((materialItem) => {
            if (_.isNil(materialItem)) {
              return Promise.reject(commonError.PARAMETER_ERROR('素材不存在'));
            }
            newReplyItem.feedbackMaterial = materialItem.id;
            globalMaterialItem = materialItem;

            return newReplyItem;
          });
      break;
    default:
      return Promise.reject(commonError.PARAMETER_ERROR('不支持的消息类型'));
  }

  return digestReplyPromise.then(
      (replyItem) => {

        debug(replyItem);
        let createReplyPromise = clazzFeedbackReplyMapper.create(replyItem);

        return Promise.all([createReplyPromise, updateFeedbackPromise])
      })
      .then((results) => {
        let userInfo = extractedUserInfo(userItem),
            replyItem = results[0];

        // 通知用户
        if (isNotifyUser === true) {
          // 推送回复消息成功
          userService.fetchById(feedbackItem.userId)
              .then((userItem) => {
                wechatTemplateReply.sendReplySuccessMsg(userItem, clazzItem);
              });
        }

        userInfo.isSelf = true;
        userInfo.isTeacher = isClazzTeacher;

        return pickReplyItem(replyItem, userInfo, globalAttachItem, globalMaterialItem);
      });
};

/**
 * 更新笃师一对一
 *
 * @param feedbackId
 * @param feedbackItem
 * @returns {*}
 */
pub.updateClazzFeedbackStatus = (feedbackId, feedbackItem) => {
  if (_.isNil(feedbackId) || !_.isPlainObject(feedbackItem)) {
    winston.error('更新笃师一对一状态失败，参数错误！！！feedbackId: %s, feedbackItem: %s', feedbackId, feedbackItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMapper.updateById(feedbackId, feedbackItem)
};

/**
 * 获取笃师一对一反馈计数
 *
 * @param feedbackIdList
 * @returns {*}
 */
pub.countFeedbackReplies = (feedbackIdList) => {
  if (!_.isArray(feedbackIdList)) {
    winston.error('计数反馈回复消息失败，参数错误！！！feedbackIdList: %j', feedbackIdList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackReplyMapper.queryAll({ clazzFeedback: feedbackIdList })
      .then((replyList) => {
        debug(replyList);

        const feedbackReplyCountMap = _.chain(replyList)
            .groupBy('clazzFeedback')
            .reduce(
                (resultMap, feedbackReplyList, clazzFeedbackId) => {
                  resultMap[clazzFeedbackId] = _.size(feedbackReplyList);

                  return resultMap;
                },
                {}
            )
            .value();

        debug(feedbackReplyCountMap);

        return feedbackReplyCountMap;
      });
};

/**
 * 管理员回复大点评
 *
 * @param feedbackItem
 * @param replyItem
 * @param adminInfo
 * @param currentClazzItem
 * @returns {*}
 */
pub.adminReplyFeedback = (feedbackItem, replyItem, adminInfo, currentClazzItem) => {
  if (!_.isPlainObject(feedbackItem) || !_.isPlainObject(replyItem) || !_.isPlainObject(adminInfo) ||
      _.isNil(feedbackItem.clazz) || _.isNil(feedbackItem.id) || !_.isNil(replyItem.id) || _.isNil(adminInfo.id)) {
    winston.error('管理员回复大点评失败，参数错误！feedbackItem: %j, replyItem: %j, adminId : %s', feedbackItem, replyItem, adminInfo.id);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const { attachId, materialId } = replyItem;
  // 设置相关信息
  const adminReply = {
    adminId: adminInfo.id,
    clazz: _.get(feedbackItem, ['clazz']),
    clazzFeedback: _.get(feedbackItem, ['id']),
    replyType: replyItem.replyType,
    content: replyItem.content,
    attach: attachId,
    feedbackMaterial: materialId
  };

  return clazzFeedbackReplyMapper.create(adminReply)
      .then((replyItem) => {
        const fetchAttachPromise = _.isNil(attachId) ? Promise.resolve(null) : attachService.fetchAttachById(attachId);
        const fetchMaterialPromise = _.isNil(materialId) ? Promise.resolve(null) : clazzFeedbackMaterialMapper.fetchById(materialId);

        return Promise.all([fetchAttachPromise, fetchMaterialPromise])
            .then(([attachItem, materialItem]) => {
              return pickReplyItem(replyItem, adminInfo, attachItem, materialItem);
            });
      })
      .then((reqplyItem) => {
        // 通知用户
        const yesterdayDate = moment().add(-1, 'days').toDate();

        const latestAlertAt = _.get(feedbackItem, ['latestAlertAt'], yesterdayDate);
        if (moment().add(-1, 'hours').isAfter(latestAlertAt)) {
          userService.fetchById(feedbackItem.userId)
              .then((userItem) => {
                // 更洗最近通知日期
                const updateAlertAtPromise = pub.updateClazzFeedbackStatus(feedbackItem.id, { latestAlertAt: new Date() });
                const alertPromise = wechatTemplateReply.sendReplySuccessMsg(userItem, currentClazzItem);

                return Promise.all([updateAlertAtPromise, alertPromise])
                    .catch(winston.error);
              });
        }

        // 更改反馈状态
        if (replyItem.replyType === enumModel.clazzFeedbackReplyTypeEnum.TEXT.key && _.trim(replyItem.content) === '1024') {
          const clazzFeedbackRound = _.get(currentClazzItem, 'configuration.feedbackRound', 0); // 班级配置中的反馈轮数
          const currentFeedbackRound = _.get(feedbackItem, 'feedbackRound', 0); // 用户当前反馈轮数

          // 更改状态为已回复，
          const newFeedbackItem = { status: enumModel.clazzFeedbackStatusEnum.REPLIED.key };
          // 如果不大于班级反馈轮数，则当前反馈书自增
          if (currentFeedbackRound < clazzFeedbackRound) {
            newFeedbackItem.feedbackRound = currentFeedbackRound + 1;
          }

          pub.updateClazzFeedbackStatus(feedbackItem.id, newFeedbackItem)
              .catch(winston.error);
        }

        return reqplyItem;
      });
};

pub.queryLatestFeedbackAt = (userId, clazzId) => {
  if (_.isNil(userId) || _.isNil(clazzId)) {
    winston.error('获取课程点评最新日期失败，参数错误！userId: %s, clazzId: %s', userId, clazzId);
    return Promise.resolve(commonError.PARAMETER_ERROR());
  }

  return clazzFeedbackMapper.query({ clazz: clazzId, userId: userId })
      .then((feedbackList) => {
        if (_.isEmpty(feedbackList)) {
          return null;
        }

        // 如果有多个，则打印错误消息，并返回第一个
        if (_.size(feedbackList) > 1) {
          winston.error('配置错误！！！用户%d在班级%s存在多条反馈记录: %j', userId, clazzId, _.map(feedbackList, 'id'));
        }

        return clazzFeedbackReplyMapper.queryLatestFeedback({
          clazzFeedback: _.head(feedbackList).id,
          clazz: clazzId
        });
      })
      .then((feedbackReplyItem) => {
        if (_.isNil(feedbackReplyItem)) {
          return null;
        }

        return feedbackReplyItem.createdAt;
      });
};

module.exports = pub;
