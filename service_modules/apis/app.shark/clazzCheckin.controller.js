'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const winston = require('winston');
const moment = require('moment');

const schemaValidator = require('../schema.validator');
const commonSchema = require('../common.schema');
const clazzSchema = require('./schema/clazz.schema');

const apiUtil = require('../util/api.util');

const apiRender = require('../render/api.render');

const enumModel = require('../../services/model/enum');

const checkinService = require('../../services/checkin.service');
const userFileService = require('../../services/userFile.service');
const clazzAccountService = require('../../services/clazzAccount.service');
const clazzLuckyCheckinService = require('../../services/clazzLuckyCheckin.service');

const clazzUtil = require('../../services/util/clazz.util');

const pub = {};

/**
 * 获取用户打卡记录
 * 返回
 * {
 *  userInfo：用户信息
 *  clazz：   课程信息
 *  checkins: 打卡记录列表
 *  [{
 *    status：       打卡状态
 *    score：        学分
 *    checkinTime：  打卡时间
 *    dayNumber:     打卡时课程天数
 *    aheadSeconds： 提前打卡秒数
 *    id： 打卡id
 *  }]
 *  scoreSum: 课程学分
 *  openDays：开班天数
 *  canCheckin： 当前是否能打卡
 *  hasCheckin： 当天是否已打卡
 * }
 *
 * @param req
 * @param res
 */
pub.queryCheckinList = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ,
      currentClazzAccountItem = req.__CURRENT_CLAZZ_ACCOUNT;

  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${req.__CURRENT_CLAZZ.id}打卡记录`, queryParam);

        const currentClazzId = currentClazzItem.id,
            todayBeginDate = moment().startOf('day').toDate(),
            todayEndDate = moment().endOf('day').toDate();

        const listUserCheckinPromise = checkinService.listCheckins(currentClazzItem, currentClazzAccountItem);
        const queryClazzTodayChecinPromise = checkinService.queryCheckinList(null, currentClazzId, todayBeginDate, todayEndDate);
        const searchClazzAccountPromise = clazzAccountService.searchClazzUsers(
            currentClazzId,
            [enumModel.clazzJoinStatusEnum.PROCESSING.key, enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.CLOSE.key],
            null,
            null
        );

        return Promise.all([listUserCheckinPromise, queryClazzTodayChecinPromise, searchClazzAccountPromise]);
      })
      .then(([userCheckinResult, todayCheckinList, clazzUserList]) => {
        debug(clazzUserList);

        userCheckinResult.checkinCount = _.size(_.get(userCheckinResult, 'checkins', []));
        userCheckinResult.canCheckin = req.__CAN_CLAZZ_CHECKIN;
        userCheckinResult.userInfo = apiUtil.pickUserBasicInfo(req.__CURRENT_USER);


        const checkinFileIds = [];
        _.forEach(userCheckinResult.checkins, (checkinItem) => {
          checkinItem.checkinTime = moment(checkinItem.checkinTime).format('YYYY-MM-DD');
          let keys = checkinItem.checkinFiles.fileKeys;
          if (!_.isNil(keys) && keys.length > 0) {
            _.each(keys, (item, index) => {
              checkinFileIds.push(item);
            });
          }
        });

        const pickedClazzItem = apiUtil.pickClazzBasicInfo(currentClazzItem);

        const clazzStartEndDate = clazzUtil.calculateClazzStartEndDate(
            currentClazzItem.startDate,
            currentClazzItem.endDate,
            currentClazzItem.clazzType,
            currentClazzAccountItem.joinDate
        );

        // 开班日期，结班日期
        pickedClazzItem.startDate = moment(clazzStartEndDate.startDate).format('YYYY-MM-DD');
        pickedClazzItem.endDate = moment(clazzStartEndDate.endDate).add(-1, 'days').format('YYYY-MM-DD');

        pickedClazzItem.accountCount = _.size(clazzUserList);
        pickedClazzItem.accountList = _.chain(clazzUserList)
            .sampleSize(3)
            .map(apiUtil.pickUserBasicInfo)
            .value();

        pickedClazzItem.todayCheckinCount = _.size(todayCheckinList);

        debug(checkinFileIds);
        userCheckinResult.clazz = pickedClazzItem;

        const filePromise = userFileService.fetchUserFilesByIdList(checkinFileIds);
        const resultPromise = Promise.resolve([]).then(() => {
          return userCheckinResult;
        });
        return Promise.all([resultPromise, filePromise])
      }).then(([userCheckinResult, files]) => {
        debug(files);
        //1.数据准备
        const fileMap = {};
        _.map(files, (fileItem) => {
          fileMap[_.get(fileItem, '_id')] = fileItem;
        });
        userCheckinResult['fileMap'] = fileMap;

        //2.添加相关的点赞数据，添加文件数据
        let new_checkins = _.map(userCheckinResult.checkins, (item) => {
          item = apiUtil.pickCheckinInfo(item, currentClazzItem.configuration.endHour);
          let fileKeys = item.checkinFiles.fileKeys;
          let itemFiles = [];
          _.each(fileKeys, (key) => {
            let f = fileMap[key];
            if (!_.isNil(f)) {
              itemFiles.push(f);
            }
          });
          item['files'] = itemFiles;
          item['liked'] = item.likeArr.includes(req.__CURRENT_USER.id);
          item['disliked'] = item.dislikeArr.includes(req.__CURRENT_USER.id);

          return item;
        });

        userCheckinResult.checkins = new_checkins;

        return apiRender.renderBaseResult(res, userCheckinResult);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};


/**
 * 分页获取用户打卡动态（班级）
 *
 *  * 1128-添加打卡文件基本信息获取
 *
 */
pub.queryClazzCheckins = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ;
  const currentClazzId = currentClazzItem.id;
  const currentUserId = req.__CURRENT_USER.id
  return schemaValidator.validatePromise(clazzSchema.clazzCheckinsSchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${req.__CURRENT_CLAZZ.id}打卡记录`, queryParam);
        // render数据
        return checkinService.fetchClazzCheckinPagedList(currentClazzId, null, queryParam.pageNumber, queryParam.pageSize, queryParam);
      })
      .then((pagedResult) => {
        const pagedCheckinList = pagedResult.values;
        const userIdList = _.map(pagedCheckinList, 'user.id');
        const filesIdList = [];
        _.map(pagedCheckinList, (checkinItem) => {
          let keys = checkinItem.checkinFiles.fileKeys;
          if (!_.isNil(keys) && keys.length > 0) {
            _.each(keys, (item, index) => {
              filesIdList.push(item);
            });
          }
        });

        debug(filesIdList);
        debug(pagedCheckinList);

        const clazzBeginDate = moment(currentClazzItem.startDate).startOf('day').toDate(),
            todayEndDate = moment().endOf('day').toDate();


        const filePromise = userFileService.fetchUserFilesByIdList(filesIdList);


        const resultPromise = checkinService.queryCheckinList(userIdList, currentClazzId, clazzBeginDate, todayEndDate)
            .then((checkinList) => {
              const userCheckinCountMap = _.chain(checkinList)
                  .groupBy('userId')
                  .reduce(
                      (prev, userCheckinList, userId) => {
                        prev[userId] = _.size(userCheckinList);
                        return prev;
                      },
                      {}
                  )
                  .value();
              const pickedPagedCheckinList = _.map(pagedCheckinList, (checkinItem) => {
                const pickedCheckin = apiUtil.pickCheckinInfo(checkinItem, currentClazzItem.configuration.endHour);

                const checkinUser = _.get(pickedCheckin, ['userInfo']);
                if (!_.isNil(checkinUser)) {
                  checkinUser.checkinCount = _.get(userCheckinCountMap, checkinUser.id, 0);
                  pickedCheckin.userInfo = checkinUser;
                }

                pickedCheckin.liked = pickedCheckin.likeArr.includes(currentUserId)
                pickedCheckin.disliked = pickedCheckin.dislikeArr.includes(currentUserId)

                return pickedCheckin;
              });

              return {
                'pickedPagedCheckinList': pickedPagedCheckinList,
                'pagedResult': pagedResult
              };
            });

        return Promise.all([resultPromise, filePromise]);
      }).then(([result, files]) => {
        let pagedResult = result.pagedResult;

        //Convert files To Map
        const fileMap = {};
        _.map(files, (fileItem) => {
          fileMap[_.get(fileItem, '_id')] = fileItem;
        });

        //Convert results and fill files
        _.map(result.pickedPagedCheckinList, (item) => {
          let fileKeys = item.checkinFiles.fileKeys;
          let itemFiles = [];
          _.each(fileKeys, (key) => {
            let f = fileMap[key];
            if (!_.isNil(f)) {
              itemFiles.push(f);
            }
          });
          item['files'] = itemFiles;
        });

        return apiRender.renderPageResult(res, {'checkins': result.pickedPagedCheckinList, 'fileMap': fileMap},
            pagedResult.itemSize, pagedResult.pageSize, pagedResult.pageNumber)
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 查询当天打卡动态
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.queryCheckinTrend = (req, res) => {
  const currentClazzItem = req.__CURRENT_CLAZZ;
  const currentClazzId = currentClazzItem.id;
  const currentUserId = req.__CURRENT_USER.id
  return schemaValidator.validatePromise(clazzSchema.checkinTrendPagedQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return checkinService.fetchClazzCheckinPagedList(currentClazzId, new Date(), queryParam.pageNumber, queryParam.pageSize);
      })
      .then((pagedResult) => {
        const pagedCheckinList = pagedResult.values;

        debug(pagedCheckinList);

        const userIdList = _.map(pagedCheckinList, 'user.id');

        const clazzBeginDate = moment(currentClazzItem.startDate).startOf('day').toDate(),
            todayEndDate = moment().endOf('day').toDate();

        return checkinService.queryCheckinList(userIdList, currentClazzId, clazzBeginDate, todayEndDate)
            .then((checkinList) => {
              const userCheckinCountMap = _.chain(checkinList)
                  .groupBy('userId')
                  .reduce(
                      (prev, userCheckinList, userId) => {
                        prev[userId] = _.size(userCheckinList);
                        return prev;
                      },
                      {}
                  )
                  .value();

              const pickedPagedCheckinList = _.map(pagedCheckinList, (checkinItem) => {
                const pickedCheckin = apiUtil.pickCheckinInfo(checkinItem, currentClazzItem.configuration.endHour);

                const checkinUser = _.get(pickedCheckin, ['userInfo']);
                if (!_.isNil(checkinUser)) {
                  checkinUser.checkinCount = _.get(userCheckinCountMap, checkinUser.id, 0);

                  pickedCheckin.userInfo = checkinUser;
                }
                pickedCheckin.liked = pickedCheckin.likeArr.includes(currentUserId)
                pickedCheckin.disliked = pickedCheckin.dislikeArr.includes(currentUserId)
                return pickedCheckin;
              });

              return apiRender.renderPageResult(res, pickedPagedCheckinList, pagedResult.itemSize, pagedResult.pageSize, pagedResult.pageNumber);
            });
      })
      .catch(req.__ERROR_HANDLER); // 错误处理
};

/**
 * 查询昨日抽打卡列表
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.fetchClazzLuckyCheckins = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.clazzLuckyCheckinQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        return clazzLuckyCheckinService.queryClazzLuckyCheckinByDate(req.__CURRENT_CLAZZ.id, queryParam.date)
            .then((luckyCheckinItem) => {
              // 如果未抽取，则返回空数组
              if (_.isNil(luckyCheckinItem)) {
                return Promise.resolve(null);
              }

              return clazzLuckyCheckinService.fetchCheckinListByLuckyCheckinItem(luckyCheckinItem)
                  .then((checkinList) => {
                    debug(checkinList);

                    const pickedLuckyCheckin = apiUtil.pickClazzLuckyCheckinBasicInfo(luckyCheckinItem);
                    const checkinEndHour = _.get(req.__CURRENT_CLAZZ, ['configuration', 'endHour']);
                    pickedLuckyCheckin.chekcins = _.map(checkinList, (checkinItem) => apiUtil.pickCheckinInfo(checkinItem, checkinEndHour));

                    return pickedLuckyCheckin;
                  });
            });
      })
      .then((luckyCheckinItem) => {
        debug(luckyCheckinItem);

        return apiRender.renderBaseResult(res, luckyCheckinItem);
      })
      .catch(req.__ERROR_HANDLER);
};


/**
 *  获取打卡的统计信息
 * @param req
 * @param res
 */
pub.getCheckinSumdata = (req, res) => {
  debug(req.__CURRENT_CLAZZ_ACCOUNT);
  schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取课程${req.__CURRENT_CLAZZ.id}打卡记录`, queryParam);

        return checkinService.listCheckins(req.__CURRENT_CLAZZ, req.__CURRENT_CLAZZ_ACCOUNT);
      })
      .then((result) => {
        let eachDayBackFee = _.pick(req.__CURRENT_CLAZZ.configuration, 'eachDayBackFee', 0);
        if(eachDayBackFee['eachDayBackFee'] > 0) {
          eachDayBackFee = eachDayBackFee['eachDayBackFee'] / 100;
        }else{
          eachDayBackFee = 0;
        }

        // render数据
        let sumData = {};
        sumData['checkinNum'] = result.scoreSum;
        sumData['joinNum'] = result.openDays;
        sumData['backMoney'] = eachDayBackFee * result.scoreSum;
        sumData['eachDayBackFee'] = eachDayBackFee;
        return apiRender.renderBaseResult(res, sumData);
      })
      .catch(req.__ERROR_HANDLER); // 错误处理

};


/**
 *
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.fetchClazzLuckyCheckinItem = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取打卡${req.__CURRENT_CHECKIN.id}详情`, queryParam);

        return checkinService.fillCheckinWithUserFiles(req.__CURRENT_CHECKIN, true);
      })
      .then((checkinItem) => {
        checkinItem.clazz = apiUtil.pickClazzBasicInfo(req.__CURRENT_CLAZZ);
        checkinItem.userFiles = checkinItem.userFiles.filter(item => item.hasCheckined);

        return apiRender.renderBaseResult(res, checkinItem);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 获取用户打卡的天数
 * @param req
 * @param res
 */
pub.getUserCheckinDays = (req, res) => {
  const userId = req.__CURRENT_USER.id;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`获取用户${userId}打卡天数`, queryParam);

        return checkinService.getUserCheckinDays(userId);
      })
      .then((number) => {
        return apiRender.renderBaseResult(res, {'checkinDays': number});
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户点赞接口
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.like = (req, res) => {
  const userId = req.__CURRENT_USER.id;
  const checkin = req.__CURRENT_CHECKIN;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`用户${userId} 点赞 ${checkin.id}打卡记录`, queryParam);
        return checkinService.like(userId, checkin);
      })
      .then((_) => {
        return apiRender.renderBaseResult(res, {});
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户取消打卡点赞接口
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.cancelLike = (req, res) => {
  const userId = req.__CURRENT_USER.id;
  const checkin = req.__CURRENT_CHECKIN;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`用户${userId} 取消点赞 ${checkin.id}打卡记录`, queryParam);
        return checkinService.cancelLike(userId, checkin);
      })
      .then((_) => {
        return apiRender.renderBaseResult(res, {});
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户对打卡点踩接口
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.dislike = (req, res) => {
  const userId = req.__CURRENT_USER.id;
  const checkin = req.__CURRENT_CHECKIN;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`用户${userId} 点踩 ${checkin.id}打卡记录`, queryParam);
        return checkinService.dislike(userId, checkin);
      })
      .then((_) => {
        return apiRender.renderBaseResult(res, {});
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 用户取消踩接口
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.cancelDislike = (req, res) => {
  const userId = req.__CURRENT_USER.id;
  const checkin = req.__CURRENT_CHECKIN;
  return schemaValidator.validatePromise(commonSchema.emptySchema, req.query)
      .then((queryParam) => {
        req.__MODULE_LOGGER(`用户${userId} 取消点踩 ${checkin.id}打卡记录`, queryParam);
        return checkinService.cancelDislike(userId, checkin);
      })
      .then((_) => {
        return apiRender.renderBaseResult(res, {});
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 点评打卡
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.createReviews = (req, res) => {
  return schemaValidator.validatePromise(clazzSchema.checkinReviewSchema, req.body)
      .then((review) => {
        review.userId = req.__CURRENT_USER.id;
        return checkinService.createReview(req.__CURRENT_CHECKIN, review);
      })
      .then((result) => {
        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER);
}

/**
 * 删除点评
 * @param req
 * @param res
 * @return {Bluebird<void>}
 */
pub.deleteReview = (req, res) => {
  return schemaValidator.validatePromise(commonSchema.mongoIdSchema, req.params.reviewId)
      .then((reviewId) => {
        return checkinService.deleteReview(req.__CURRENT_CHECKIN, reviewId);
      })
      .then((result) => {
        return apiRender.renderBaseResult(res, result);
      })
      .catch(req.__ERROR_HANDLER);
}



/**
 * 更新加精状态
 */
pub.updateFeatured = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.updateFeatured, req.body)
      .then((checkin) => {
        return checkinService.updateCheckinItem(req.__CURRENT_CHECKIN.id, checkin);
      })
      .then(() => {
        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
