'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');

const systemConfig = require('../../../config/config');
const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzActivitySchema = require('./schema/clazzActivity.schema');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const clazzActivityService = require('../../services/clazzActivity.service');

const activityUtil = require('../../services/util/activity.util');

const pub = {};

/**
 * 将分组结果匹配成可视化数据
 *
 * @param matchedRoomMap
 */
const parseMatchMapToStatistics = (matchedRoomMap) => ({
  '男->男': _.size(matchedRoomMap.maleMale),
  '女->女': _.size(matchedRoomMap.femaleFemale),
  '男->女': _.size(matchedRoomMap.mixedMaleFemale),
  '男->女未知': _.size(matchedRoomMap.mixedMaleFemaleKnown),
  '女->男未知': _.size(matchedRoomMap.mixedFemaleMaleUnknown),
  '未知->未知': _.size(matchedRoomMap.unknownUnknown),
  '随机分配': _.size(matchedRoomMap.random)
});

/**
 * 匹配未分组参加活动的学员
 *
 * @param req
 *  query:
 *    algorithm: 匹配算法， 目前支持random及normal
 *    isSave： 是否保存   仅在为true时进行保存和通知动作
 * @param res
 * @returns {Promise.<TResult>|Promise}
 */
pub.matchUnmatchActivityAccountList = (req, res) => {
  // todo activityInfo应由请求参数决定
  const activityInfo = systemConfig.ACTIVITY_CONFIG.MORNING_CALL;

  return schemaValidator.validatePromise(clazzActivitySchema.createActivityRoomBodySchema, req.body)
      .then((roomRequirement) => {
        debug(roomRequirement);

        // 不同算法对应的生成房间算法
        let generateNotifyMessageFunction;

        return clazzActivityService.queryUnmatchedActivityAccountList(activityInfo)
            .then((activityAccountList) => {
              /**
               * 根据请求的算法的不同，调用对应的匹配算法，并设置对应的生成房间算法
               */
              switch (roomRequirement.algorithm) {
                case 'random':
                  generateNotifyMessageFunction = (partnerGenderName, partnerIntroduction) => {
                    return {
                      title: '恭喜你～系统已经给你已经匹配到了一个优伴～\n（抱歉，树洞君寻遍千里，无法满足你的需求，只能帮你随机匹配～）\n性别：' + partnerGenderName + '\n优伴说：#' + partnerIntroduction + '#',
                      description: '下周的时间里，将是有趣的一周\n现在，你们还不能联系\n周一早晨，我们会分配给你们当天的任务\n你可以用暗号 ‘U树洞开启’ 打开树洞\n\n你可以点击这个消息，进入你们的房间\n【点击查看房间】',
                      url: 'http://wechat.gambition.cn/game/mc/room'
                    };
                  };

                  return activityUtil.randomMatchActivityAccount(activityAccountList);
                case 'normal':
                  generateNotifyMessageFunction = (partnerGenderName, partnerIntroduction) => {
                    return {
                      title: '恭喜你～系统已经给你已经匹配到了一个优伴～\n性别：' + partnerGenderName + '\n优伴说：#' + partnerIntroduction + '#',
                      description: '下周的时间里，将是有趣的一周\n现在，你们还不能联系\n周一早晨，我们会分配给你们当天的任务\n你可以用暗号 ‘U树洞开启’ 打开树洞\n\n你可以点击这个消息，进入你们的房间\n【点击查看房间】',
                      url: 'http://wechat.gambition.cn/game/mc/room'
                    };
                  };

                  return activityUtil.matchActivityAccount(activityAccountList);
                default:
                  return Promise.reject(commonError.PARAMETER_ERROR('不支持的分配算法'));
              }
            })
            .then((matchedRoomMap) => {
              const matchStatistics = parseMatchMapToStatistics(matchedRoomMap);

              if (roomRequirement.isSave === true) {
                const matchedRoomList = _.flatten([
                  matchedRoomMap.maleMale,
                  matchedRoomMap.femaleFemale,
                  matchedRoomMap.mixedMaleFemale,
                  matchedRoomMap.mixedMaleFemaleKnown,
                  matchedRoomMap.mixedFemaleMaleUnknown,
                  matchedRoomMap.unknownUnknown,
                  matchedRoomMap.random
                ]);

                // 生成每个房间，并通知相应人员
                const createRoomPromiseList = _.map(
                    matchedRoomList,
                    (activityAccountList) => clazzActivityService.createActivityRoomItem(activityInfo, activityAccountList, generateNotifyMessageFunction)
                );

                return Promise.all(createRoomPromiseList)
                    .then((activityRoomList) => {
                      debug(_.size(activityRoomList));

                      return matchStatistics;
                    });
              } else {
                return matchStatistics;
              }
            });
      })
      .then((matchStatistics) => {
        return apiRender.renderBaseResult(res, matchStatistics);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 查询活动未分组情况
 *
 * @param req
 * @param res
 * @returns {Promise.<TResult>|Promise}
 */
pub.queryUnmatchActivityAccountStatistics = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const activityInfo = systemConfig.ACTIVITY_CONFIG.MORNING_CALL;

        return clazzActivityService.queryUnmatchedActivityAccountList(activityInfo)
            .then((activityAccountList) => {
              // 性别枚举Key
              const unknownGenderEnumKey = enumModel.genderEnum['0'].key,
                  maleGenderEnumKey = enumModel.genderEnum['1'].key,
                  femaleGenderEnumKey = enumModel.genderEnum['2'].key;
              /*
               形如下方的用户列表Map
               {
               maleGenderEnumKey: [males],
               femaleGenderEnumKey: [females]
               }
               */
              const genderListMap = _.groupBy(activityAccountList, 'gender');
              /*
               形如下方的用户列表Map
               {
               unknownGenderEnumKey: [unknowns],
               maleGenderEnumKey: [males],
               femaleGenderEnumKey: [females]
               }
               */
              const maleListMap = _.groupBy(genderListMap[maleGenderEnumKey], 'partnerRequired.gender');
              const femaleListMap = _.groupBy(genderListMap[femaleGenderEnumKey], 'partnerRequired.gender');


              // 随机打乱列表
              const maleUnknownList = _.shuffle(maleListMap[unknownGenderEnumKey]),   // 男->未知 列表
                  maleMaleList = _.shuffle(maleListMap[maleGenderEnumKey]),           // 男->男   列表
                  maleFemaleList = _.shuffle(maleListMap[femaleGenderEnumKey]),       // 男->女   列表
                  femaleUnknownList = _.shuffle(femaleListMap[unknownGenderEnumKey]), // 女->未知  列表
                  femaleMaleList = _.shuffle(femaleListMap[maleGenderEnumKey]),       // 女->男   列表
                  femaleFemaleList = _.shuffle(femaleListMap[femaleGenderEnumKey]);   // 女->女   列表

              return {
                '男->男': _.size(maleMaleList),
                '女->女': _.size(femaleFemaleList),
                '男->女': _.size(maleFemaleList),
                '女->男': _.size(femaleMaleList),
                '男->未知': _.size(maleUnknownList),
                '女->未知': _.size(femaleUnknownList)
              };
            });
      })
      .then((matchStatistics) => {
        return apiRender.renderBaseResult(res, matchStatistics);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 解散单方面未回复优伴消息的房间，其中已回复消息的学员重新分组
 *
 * @param req
 * @param res
 */
pub.dismissQuietGroupAndRematch = (req, res) => {
  // todo activityInfo应由请求参数决定
  const activityInfo = systemConfig.ACTIVITY_CONFIG.MORNING_CALL;

  let globalIsSave = false; // 是否进行保存
  schemaValidator.validatePromise(clazzActivitySchema.rematchActivityRoomBodySchema, req.body)
      .then((rematchRequirement) => {
        debug(rematchRequirement);

        globalIsSave = rematchRequirement.isSave;

        return clazzActivityService.filterRematchRequiredUserActivityLIst(
            activityInfo.id,
            activityInfo.version,
            rematchRequirement.demandedIds
        );
      })
      .then(activityAccountList => activityUtil.randomMatchActivityAccount(activityAccountList))
      .then((matchedRoomMap) => {
        const matchStatistics = parseMatchMapToStatistics(matchedRoomMap);

        const matchedRoomList = _.flatten([
          matchedRoomMap.maleMale,
          matchedRoomMap.femaleFemale,
          matchedRoomMap.mixedMaleFemale,
          matchedRoomMap.mixedMaleFemaleKnown,
          matchedRoomMap.mixedFemaleMaleUnknown,
          matchedRoomMap.unknownUnknown,
          matchedRoomMap.random
        ]);

        if (globalIsSave === true) {
          const roomIdList = _.reduce(
              matchedRoomList,
              (idList, activityAccountList) => {
                debug(activityAccountList);
                return _.flatten([idList, _.map(activityAccountList, 'clazzActivityRoom')])
              },
              []
          );

          debug(roomIdList);
          // 解散原来的班级
          return clazzActivityService.dismissRoomList(roomIdList)
              .then((dismissedRoomList) => {
                debug(dismissedRoomList);

                // 生成通知消息内容函数
                const generateNotifyMessageFunction = (partnerGenderName, partnerIntroduction) => {
                  return {
                    title: '我知道你有点小遗憾\n但是我们选择不让你遗憾\n树洞菌一言不合给你重新匹配了新优伴\n\n宣言：#' + partnerIntroduction + '#\n性别：' + partnerGenderName,
                    description: '赶紧回复 U树洞开启 和对方打一个招呼吧。'
                  };
                };

                // 生成每个房间，并通知相应人员
                const createRoomPromiseList = _.map(
                    matchedRoomList,
                    (activityAccountList) => {
                      return clazzActivityService.createActivityRoomItem(
                          activityInfo,
                          activityAccountList,
                          generateNotifyMessageFunction
                      );
                    }
                );

                return Promise.all(createRoomPromiseList)
                    .then((activityRoomList) => {
                      debug(_.size(activityRoomList));

                      return matchStatistics;
                    });
              });
        }

        return matchStatistics;
      })
      .then((matchStatistics) => {
        debug(matchStatistics);
        return apiRender.renderBaseResult(res, matchStatistics);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
