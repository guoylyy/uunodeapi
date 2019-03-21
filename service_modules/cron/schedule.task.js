'use strict';

const _ = require('lodash');
const winston = require('winston');
const moment = require('moment');
const Promise = require('bluebird');
const debug = require('debug')('schedule');

const systemConfig = require('../../config/config');
const apiRender = require('../apis/render/api.render');

const enumModel = require('../services/model/enum');

const clazzService = require('../services/clazz.service');
const clazzAccountService = require('../services/clazzAccount.service');
const clazzTaskService = require('../services/clazzTask.service');
const postService = require('../services/post.service');
const pushFailLogService = require('../services/pushFailLog.service');
const wechatTokenService = require('../services/wechatToken.service');
const userService = require('../services/user.service');
const checkinService = require('../services/checkin.service');
const clazzActivityService = require('../services/clazzActivity.service');

const accountUtil = require('../services/util/account.util');
const clazzUtil = require('../services/util/clazz.util');

const jpushComponent = require('../services/component/jpush.component');
const cacheWrapConponent = require('../services/component/cacheWrap.component');

const wechatAuth = require('../lib/wechat.auth');
const wechatUser = require('../lib/wechat.user');
const wechatTemplateReply = require('../lib/wechat.template.reply');
const wechatTemplateMessage = require('../lib/wechat.template.message');
const wechatCustomMessage = require('../lib/wechat.custom.message');

/**
 * 推送模板消息
 *
 * @param templateMessages
 * @param resend            是否重发消息
 * @param clazzId
 * @param postId
 * @returns {Promise.<TResult>}
 */
const pushTemplateMessages = (templateMessages, resend, clazzId, postId) => {
  // 如果推送列表为空，则直接返回
  if (_.isEmpty(templateMessages)) {
    return Promise.resolve({
      true: 0,
      false: 0
    });
  }

  return wechatAuth.requestLocalWechatAccessToken()
      .then((accessToken) => {
        const pushMessagePromiseList = _.map(templateMessages, (templateMessage) => {
          return wechatTemplateReply.postTemplateWithToken(templateMessage.message, accessToken, resend, clazzId, templateMessage.userId, postId);
        });

        return Promise.all(pushMessagePromiseList);
      })
      .then((results) => {
        debug(results);

        const countMap = _.countBy(results);

        winston.info('[push_template_message_success_count] : %s', countMap[true] || 0);
        winston.info('[push_template_message_fail_count] : %s', countMap[false] || 0);

        return countMap;
      })
};

// 学员加入成功状态数组
const JOINED_CLAZZ_ACCOUNT_STATUS_LIST = [enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.PROCESSING.key];

/**
 * 处理推送任务
 *
 * @param clazzItem
 * @param userList
 * @param redirectUrl
 * @returns {Array}
 */
const mapToTemplateMessages = (clazzItem, userList, redirectUrl) => {
  const clazzStartDate = clazzItem.startDate,
      clazzType = clazzItem.clazzType,
      clazzName = clazzItem.name,
      todayStartMoment = moment().startOf('day'),
      templateMessages = [];

  // 遍历学员，计算加班天数，获取任务
  _.forEach(userList, (userItem) => {
    const dayNumber = clazzUtil.calculateClazzDayNumber(clazzStartDate, userItem.clazzAccount.joinDate, clazzType);
    const userClazzEndDate = (clazzItem.clazzType === enumModel.clazzTypeEnum.LONG_TERM.key)
        ? _.get(userItem, ['clazzAccount', 'endDate'], todayStartMoment.toDate())
        : todayStartMoment.toDate();

    // 当天开始日期在用户班级截止日期之前，才将其加入推送列表
    if (todayStartMoment.isSameOrBefore(userClazzEndDate)) {
      const templateMessage = wechatTemplateMessage.MORNING_ALERT(
          userItem.openId,
          userItem.name,
          dayNumber,
          clazzName,
          redirectUrl
      );

      templateMessages.push({
        userId: userItem.id,
        message: templateMessage
      });
    }
  });

  debug(templateMessages);

  return templateMessages;
};

const pub = {};

/**
 * 执行推送任务
 *
 * @param clazzId
 * @param postId
 * @returns {Promise|Promise.<TResult>}
 */
pub.pushPost = (clazzId, postId) => {
  const fetchClazzPromise = clazzService.fetchClazzById(clazzId),
      fetchPostPromise = postService.fetchClazzPostById(postId, clazzId),
      queryClazzUsersPromise = clazzAccountService.searchClazzUsers(clazzId, JOINED_CLAZZ_ACCOUNT_STATUS_LIST, null, []);

  return Promise.all([fetchClazzPromise, fetchPostPromise, queryClazzUsersPromise])
      .then(([clazzItem, postItem, userList]) => {

        debug(clazzItem);
        debug(postItem);

        // 检查推送任务配置是否合法，是否处于待发送状态
        if (_.isNil(clazzItem) || _.isNil(postItem) || postItem.clazzId !== clazzId || postItem.status !== enumModel.postStatusEnum.WAITING.key) {
          winston.error('执行推送任务失败！！！参数错误！ postId: %s', postId);
          return Promise.reject(new Error('执行推送任务失败，参数错误！！！'))
        }

        const postType = postItem.postType,
            postTarget = postItem.target;

        // 极光推送
        // todo 长期班需处理
        jpushComponent.pushClazzTask(
            clazzId,
            postType,
            postTarget,
            postItem.title,
            postItem.id,
            `${ clazzItem.name } 新的挑战开始了，快快完成任务吧。(任务完成后记得点打卡哦)\n平庸，就是失去追求卓越信念的那个瞬间。今日再接再厉！！快快点击【详情】进入今日任务开启新的征程。`
            )
            .catch(winston.error);

        // todo 提取为统一方法
        switch (postType) {
          case enumModel.postTypeEnum.LINK.key:
            return mapToTemplateMessages(clazzItem, userList, postTarget);
            break;
          case enumModel.postTypeEnum.CLAZZ_TASK.key:
            return clazzTaskService.fetchClazzTaskById(postTarget, clazzId)
                .then((taskItem) => {
                  const redirectUrl = clazzUtil.getClazzTaskUrl(clazzItem.id, taskItem.id, postId);

                  return mapToTemplateMessages(clazzItem, userList, redirectUrl);
                });
            break;
          default:
            winston.error('执行推送任务失败！！！不支持的推送类型！ postId: %s', postId);
            return Promise.reject(new Error('执行推送任务失败，配置错误！！！'))
        }
      })
      .then((templateMessages) => {
        debug(templateMessages);

        return pushTemplateMessages(templateMessages, true, clazzId, postId);
      })
      .then((pushResult) => {
        debug(pushResult);
        const result = {
          sendTime: new Date(),
          success: pushResult[true] || 0,
          fail: pushResult[false] || 0
        };

        // 标记推送已发送
        postService.updateClazzPost({
          id: postId,
          status: enumModel.postStatusEnum.SENDED.key,
          result: JSON.stringify(result)
        });
      })
      .catch((error) => {
        winston.error(error);

        // todo 错误处理
      });
};

/**
 * 重新推送已失败的任务
 *
 * @returns {Promise.<TResult>|Promise}
 */
pub.repushFailTemplates = () => {
  return pushFailLogService.listUnresendMessages()
      .then((failLogs) => {
        let templateMessages = _.map(failLogs, (failLog) => {
          return {
            userId: failLog.userId,
            message: failLog.template
          }
        });

        return pushTemplateMessages(templateMessages, true)
            .then((countMap) => {
              debug(countMap);

              return pushFailLogService.markPushFailLogsResended(_.map(failLogs, 'id'));
            });
      })
      .catch(winston.error);
};

/**
 * 同步微信accessToken及js api ticket
 *
 * @returns {Promise.<T>|Promise}
 */
pub.syncWechatTokenAndTicket = () => {
  return wechatAuth.requestRemoteWechatAccessToken()
      .then((accessToken) => {
        return wechatTokenService.saveAccessToken(accessToken);
      })
      .then((accessTokenItem) => {
        return wechatAuth.requestRemoteWechatJsApiTicket(accessTokenItem.token);
      })
      .then((jsApiTicket) => {
        return wechatTokenService.saveTicket(jsApiTicket);
      })
      .catch((error) => {
        winston.error(error);

        // todo 错误处理
      })
};

/**
 * 统计班级学生的数目，并存入缓存之中
 *
 * @returns null
 */
pub.statisticsStudentNumber = () =>{
  const clazzPromise = clazzService.queryClazzes(enumModel.clazzStatusEnum.OPEN.key,null, null, null, null);
  let idList = [];
  let clazzAccountMap ={};
  clazzPromise.then((clazzs)=>{
    //统计所有开放报名的班级的人数
    let staticticsClazzList = _.filter(clazzs, (item) =>{
      if(item.status === enumModel.clazzStatusEnum.OPEN.key ||
          item.status === enumModel.clazzStatusEnum.PROCESSING.key){
        return true;
      }else{
        return false;
      }
    });
    _.map(staticticsClazzList, (item) => {
        idList.push(item.id);
    });
    debug("=== Clazz List IDs ===");
    return clazzAccountService.countClazzsJoinedUserByGroup(idList);
  }).then((statisticsMap)=>{
    let cacheMapPromise = cacheWrapConponent.get("CLAZZ_USER_NUMBER");

    let listPromise = _.chain(statisticsMap);

    return Promise.all([listPromise, cacheMapPromise]);
  }).then(([statisticsList, cacheMap])=>{

    if(cacheMap == null){
      cacheMap = {};
    }

    let list = statisticsList.get("models").toJSON();
    debug("=== UPDATE CLAZZ USER COUNT MAP ===");
    for(let index in list){
      let item = list[index];
      let clazzIdKey = item.get("clazzId");
      let itemValue = {'count': item.get('count'),'clazzId': item.get('clazzId')};
      if(itemValue){
        cacheMap[clazzIdKey] = itemValue;
      }
    }
    debug(cacheMap);
    clazzAccountMap = cacheMap;
    //Add To REDIS
    return cacheWrapConponent.set('CLAZZ_USER_NUMBER', cacheMap);
  }).then((rc)=>{
    debug(rc);
    return true
  }).catch((error)=>{
    winston.error(error);
  });
};


/**
 * 为未生成学号的用户增加学号
 * 1. 首先获取当前最大学号，构造学号生成函数
 * 2. 查询学员列表
 * 3. 保存生成的学号
 *
 * @returns {Promise.<TResult>|Promise}
 */
pub.generateStudentNumber = () => {
  // 或者正在进行中的班级列表
  // 过滤掉 推广活动
  return clazzService.queryClazzes(enumModel.clazzStatusEnum.PROCESSING.key)
      .then((clazzList) => {
        debug(clazzList);
        return _.chain(clazzList)
            .filter((clazzItem) => {
              // 过滤掉 推广活动
              return clazzItem.clazzType !== enumModel.clazzTypeEnum.PROMOTION.key
            })
            .map('id')
            .value();
      })
      .then((clazzIdList) => {
        debug(clazzIdList);
        // 先获取当前最大学号，构造学号生成函数
        return userService.fetchMaxStudentNumber()
            .then((maxStudentNumber) => {
              debug(maxStudentNumber);

              return accountUtil.calculateNextStudentNumber(maxStudentNumber);
            })
            .then((nextStudentNumber) => {
              const clazzJoinedStatusList = [enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.CLOSE.key];

              const queryUsersPromiseList = _.map(
                  clazzIdList,
                  (clazzId) => {
                    return clazzAccountService.searchClazzUsers(clazzId, clazzJoinedStatusList, null, []);
                  });

              // 查询学员列表
              return Promise.all(queryUsersPromiseList)
                  .then((results) => {
                    debug(results);
                    debug(_.size(results));

                    return _.chain(results)
                        .flatten()                                              // 扁平化结果 [[user1, user2], [use2], [user1, user3]] => [user1, user2, user2, user1, user4]
                        .uniqBy('id')                                           // 去除重复  [user1, user2, user2, user1, user4] => [user1, user2, user3, user4]
                        .filter((userItem) => _.isNil(userItem.studentNumber))  // 去除已有学员的学员
                        .map((userItem) => {                                    // 生成学号
                          return {
                            id: userItem.id,
                            studentNumber: nextStudentNumber()
                          };
                        })
                        .value();
                  });
            });
      })
      .then((toUpdateUserList) => {
        debug(`to update size ${ _.size(toUpdateUserList) }`);
        debug(toUpdateUserList);

        const saveUserPromiseList = _.map(toUpdateUserList, (userItem) => {
          return userService.updateUserItem(userItem.id, { studentNumber: userItem.studentNumber });
        });

        // 保存生成的学号
        return Promise.all(saveUserPromiseList);
      })
      .then((updatedUserList) => {
        debug(`updated user size ${ _.size(updatedUserList) }`);

        _.forEach(updatedUserList, (userItem) => {
          const messageEntity = wechatCustomMessage.makeCustomMessage(userItem.openId, "TEXT", { content: `亲爱的新笃友，你的学号是${ userItem.studentNumber }，欢迎加入Uband友班。` });

          wechatCustomMessage.sendCustomMessage(messageEntity);
        });

        return null;
      })
      .catch((error) => {
        winston.error(error);

        // todo 错误处理
      });
};

/**
 * 重复学号处理器
 * 1. 获取所有有学号的学员
 * 2. 筛选出重复学号的学员列表
 * 3. 重新生成学号
 * 4. 保存
 */
pub.duplicateStudentNumberHandler = () => {
  userService.queryAllStudentNumberedUserList()
      .then((userList) => {
        // 筛选重复学号的用户列表
        const duplicateStudentNumberUserIdMap = _.reduce(
            _.groupBy(userList, 'studentNumber'),
            (userMap, users, studentNumber) => {
              if (_.size(users) > 1) {
                userMap[studentNumber] = _.map(users, 'id');
              }

              return userMap;
            },
            {}
        );

        debug(duplicateStudentNumberUserIdMap);
        debug(_.size(duplicateStudentNumberUserIdMap));

        // 各个学号前缀的学号生成器
        const studentNumberGeneratorMap = _.reduce(
            _.groupBy(userList, (userItem) => userItem.studentNumber.substr(0, 3)),
            (studentNumberMap, users, studentNumberPrefix) => {
              let studentNumberPostfix = Number(_.maxBy(users, 'studentNumber').studentNumber.substr(3));

              studentNumberMap[studentNumberPrefix] = () => {
                studentNumberPostfix += 1;

                if (studentNumberPostfix > 999) {
                  throw new Error(`${ studentNumberPrefix } student number overflow`);
                }

                return `${ studentNumberPrefix }${ studentNumberPostfix }`
              };

              return studentNumberMap;
            },
            {}
        );

        debug(studentNumberGeneratorMap);

        // 重新生成学号
        const updateUserPromiseList = _.reduce(
            duplicateStudentNumberUserIdMap,
            (userList, userIdList, studentNumber) => {
              const studentNumberPrefix = studentNumber.substr(0, 3);

              _.forEach(_.tail(userIdList), (userId) => {
                userList.push(userService.updateUserItem(userId, {
                  studentNumber: studentNumberGeneratorMap[studentNumberPrefix]()
                }))
              });

              return userList;
            },
            []
        );

        debug(updateUserPromiseList);
        debug(_.size(updateUserPromiseList));

        return Promise.all(updateUserPromiseList);
      })
      .then((updatedUsers) => {
        debug(updatedUsers);

        winston.info('updated %d users', _.size(updatedUsers));

        // 通知用户
        _.forEach(updatedUsers, (userItem) => {
          const messageEntity = wechatCustomMessage.makeCustomMessage(userItem.openId, "TEXT", { content: `亲爱的新笃友，你的学号已更新为${ userItem.studentNumber }，对于因此造成的影响Uband友班表示非常抱歉。` });

          wechatCustomMessage.sendCustomMessage(messageEntity);
        });

        return null;
      })
      .catch(winston.error);
};

/**
 * 推送未打卡提醒
 *
 * 1. 获取班级信息
 * 2. 查询当天未打卡学员列表
 * 3. 获取推送token
 * 4. 构造推送消息并退送之
 */
pub.pushClazzUncheckinAlert = () => {
  // 支持的班级配置列表
  const clazzIdList = systemConfig.CRON_CONFIG.UNCHECKIN_ALERT_CLAZZ_LIST;

  // 1. 获取班级信息
  const queryClazzPromiseList = _.map(clazzIdList, (clazzId) => {
    return clazzService.fetchClazzById(clazzId);
  });

  Promise.all(queryClazzPromiseList)
      .then((clazzItemList) => {
        // 构造 id -> clazz 映射关系
        const clazzMap = _.keyBy(clazzItemList, 'id');

        debug(clazzMap);

        // 2. 查询当天未打卡学员列表
        const queryUncheckinUsersPromiseList = _.map(clazzIdList, (clazzId) => {
          return checkinService.queryClazzUncheckinUserList(clazzId, new Date(), '');
        });

        let clazzUsersListGlobal; // 学员列表记录器
        return Promise.all(queryUncheckinUsersPromiseList)
            .then((clazzUsersList) => {
              clazzUsersListGlobal = clazzUsersList;

              // 3. 获取推送token
              return wechatAuth.requestLocalWechatAccessToken();
            })
            .then((accessToken) => {
              // 4. 构造推送消息并退送之
              const sendAlertPromiseList = _.chain(clazzUsersListGlobal)
                  .flatten()
                  .map((clazzUser) => {
                    const clazzItem = clazzMap[clazzUser.clazzAccount.clazzId];

                    const templateMessage = wechatTemplateMessage.EVENING_ALERT(
                        clazzUser.openId,
                        clazzUser.name,
                        clazzUtil.getClazzMainPageUrl(clazzItem.id),
                        clazzItem.name
                    );

                    return wechatTemplateReply.postTemplateWithToken(templateMessage, accessToken, true, clazzItem.id, clazzUser.id);
                  })
                  .value();

              return Promise.all(sendAlertPromiseList);
            });
      })
      .catch((error) => {
        winston.error(error);

        // todo 错误处理
      });
};

/**
 * 关闭 endDate在过去，且状态为OPEN的活动房间
 */
pub.closeOpenActivityRoom = () => {
  const closeMessage = '#U树洞#快乐的时间流逝太快，树洞缓缓关闭。';

  winston.info('开始关闭活动房间');

  clazzActivityService.queryActivityRoomList(enumModel.activityRoomStatusEnum.OPEN.key, new Date())
      .then((activityRoomList) => {
        winston.info('应关闭活动房间共 %d 个', _.size(activityRoomList));

        _.forEach(activityRoomList, (roomItem) => {
          const roomId = roomItem.id;
          // 构造关闭消息，并推送
          clazzActivityService.updateActivityRoomStatusById(roomId, enumModel.activityRoomStatusEnum.CLOSED.key)
              .catch((error) => {
                winston.error(error);
                winston.error('关闭活动房间[ %s ]失败！！！', roomId);
              });

          const partnerInfoList = _.get(roomItem, 'partnerInfoList', []);

          _.forEach(partnerInfoList, (userInfo) => {
            wechatCustomMessage.makeAndSendCustomTextMessage(userInfo.openId, closeMessage)
                .catch((error) => {
                  winston.error(error);

                  winston.error('给活动房间 [ %s ] 用户 [%s] 推送房间关闭消息失败！！！', roomId, userInfo.id);
                });
          });
        })
      })
      .catch(winston.error);
};

const clazzRankService = require('../services/clazzRank.service');

pub.updateClazzRankList = () => {
  debug('开始执行更新班级打卡排行');
  return clazzService.queryAllProcessingClazzList()
      .then((clazzList) => {
        debug(clazzList);
        const nowMoment = moment();

        const yesterdayBeginDate = moment().add(-1, 'days').startOf('day').toDate(),
            yesterdayEndDate = moment().add(-1, 'days').endOf('day').toDate();

        const updateAllClazzRankPromise = _.chain(clazzList)
            .reject((clazzItem) => {
              // 过滤掉 推广班  及 已结束的班级
              const isPromotion = clazzItem.clazzType === enumModel.clazzTypeEnum.PROMOTION.key;
              const isClosed = nowMoment.isAfter(clazzItem.endDate);

              return isPromotion || isClosed;
            })
            .map((clazzItem) => {
              const currentClazzId = clazzItem.id,
                  diffHour = clazzItem.configuration.endHour - 24;

              const queryAllClazzRankListPromise = clazzRankService.queryAllClazzRankList(currentClazzId);
              const queryYesterdayCheckinListPromieList = checkinService.queryCheckinList(null, currentClazzId, yesterdayBeginDate, yesterdayEndDate);

              return Promise.all([queryAllClazzRankListPromise, queryYesterdayCheckinListPromieList])
                  .then((result) => {
                    const clazzRankList = result[0],
                        checkinList = result[1];

                    debug(clazzRankList);

                    const clazzRankMap = _.keyBy(clazzRankList, 'userId');

                    // 根据打卡记录，更新排行榜分数
                    _.forEach(
                        checkinList,
                        (checkinItem) => {
                          const userId = checkinItem.userId,
                              checkinMoment = moment(checkinItem.checkinTime),
                              checkinEndMoment = moment(checkinItem.checkinTime).endOf("day").add(diffHour, 'hours');

                          // 计算提前打卡时间 小时数
                          const aheadHours = checkinEndMoment.diff(checkinMoment, 'hours') + 1;

                          const clazzRankItem = clazzRankMap[userId] || {
                            clazzId: currentClazzId,
                            userId: userId,
                            rank: 0,
                            grade: 0
                          };

                          // 更新排行榜分数，最多+5分
                          clazzRankItem.grade += _.min([5, aheadHours]);

                          clazzRankMap[userId] = clazzRankItem;
                        }
                    );

                    // 重新计算排名
                    const updateClazzRankPromise = _.chain(clazzRankMap)
                        .values()
                        .sortBy('grade')
                        .reverse()
                        .map((clazzRankItem, index) => {
                          // 计算新的顺序
                          const rank = index + 1,
                              oldRank = clazzRankItem.rank;

                          // 更新排序
                          clazzRankItem.rank = rank;

                          const clazzRankId = clazzRankItem.id;

                          return clazzRankId
                              ? clazzRankService.updateClazzRankItem({
                                id: clazzRankId,
                                rank: clazzRankItem.rank,
                                grade: clazzRankItem.grade
                              })
                              : clazzRankService.createClazzRankItem(clazzRankItem);
                        })
                        .value();

                    return Promise.all(updateClazzRankPromise);
                  })
            })
            .value();

        debug('更新班级打卡排行执行结束');
        return Promise.all(updateAllClazzRankPromise);
      })
      .catch(winston.error);
};

pub.syncUserUnionid = () => {
  // 标记是否继续执行
  let isNextRun = true;

  let syncUserUnionidAction = (userIdStart, userIdEnd) => {
    // 1.1. query 1000 users
    return userService.queryUser(null, _.range(userIdStart, userIdEnd))
        // 1.2 update them
        .then(userList => wechatUser.syncUserInfoList(userList));
  };

  let syncUserUnionidRecursive = () => {
    const userIdIncrement = 1000;
    let userIdStart = -999, userIdEnd = 0;

    const action = () => {
      if (isNextRun) {
        userIdStart += userIdIncrement;
        userIdEnd += userIdIncrement;

        return syncUserUnionidAction(userIdStart, userIdEnd)
            .then(action)
            .catch(action);
      }

      return Promise.resolve(null);
    };

    return action();
  };

  return syncUserUnionidRecursive()
      .catch((error) => {
        winston.error(error);
      });
};

module.exports = pub;
