'use strict';

const _ = require('lodash');
const moment = require('moment');
const winston = require('winston');
const debug = require('debug')('service');
const Promise = require('bluebird');

const commonError = require('./model/common.error');
const clazzUtil = require('./util/clazz.util');
const fileUtil = require('./util/file.util');
const enumModel = require('./model/enum');

const userService = require('./user.service');
const clazzAccountService = require('./clazzAccount.service');
const userFileService = require('./userFile.service');

const checkinMapper = require('../dao/mongodb_mapper/checkin.mapper');
const userFileMapper = require('../dao/mongodb_mapper/userFile.mapper');
const clazzAccountRecordMapper = require('../dao/mysql_mapper/clazzAccountRecord.mapper');

const wechatFile = require('../lib/wechat.multimedia.file');

const pub = {};

// 学员加入成功状态数组
const joinedClazzAccountStatusList = [enumModel.clazzJoinStatusEnum.WAITENTER.key, enumModel.clazzJoinStatusEnum.PROCESSING.key];

/**
 * 获取课程打卡记录
 *
 * @param clazzItem
 * @param clazzAccountItem
 * @returns {*}
 */
pub.listCheckins = (clazzItem, clazzAccountItem) => {
  debug(clazzItem);
  // 参数检查
  if (!_.isPlainObject(clazzItem) || !_.isPlainObject(clazzAccountItem)) {
    winston.error('获取课程打卡记录失败，参数错误！！！clazz: %j, clazzAccount: %j。', clazzItem, clazzAccountItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const clazzId = clazzItem.id,
      clazzStartDate = clazzItem.startDate,
      clazzType = clazzItem.clazzType,
      clazzEndDate = clazzItem.endDate,
      userId = clazzAccountItem.userId,
      checkinEndHour = clazzItem.configuration.endHour,
      userJoinDate = clazzAccountItem.joinDate;

  // 计算开班日期
  const nowMoment = moment();

  const queryClazzCheckinListPromise = checkinMapper.queryCheckinList(
      {
        'userId': userId,
        'clazz': clazzId,
        checkinTime: {$lte: nowMoment.toDate()}
      }),
      queryClazzAccountRecordListPromise = clazzType === enumModel.clazzTypeEnum.LONG_TERM.key
          ? clazzAccountRecordMapper.queryClazzAccountRecordList({clazzAccountId: clazzAccountItem.id})
          : Promise.resolve([{startDate: clazzStartDate, endDate: clazzEndDate}]);

  return Promise.all([queryClazzCheckinListPromise, queryClazzAccountRecordListPromise])
      .then((results) => {
        const checkinList = results[0],
            clazzAccountRecordList = results[1],
            diffHour = checkinEndHour - 24,
            clazzDayNumber = clazzUtil.calculateClazzDayNumber(clazzStartDate, userJoinDate, clazzType);

        let scoreSum = 0;      // 学分累加器
        // 计算提前打卡时间，打卡天数，获得学分
        _.forEach(checkinList, (checkin) => {
          // 计算打卡天数
          checkin.dayNumber = clazzUtil.calculateClazzDayNumber(clazzStartDate, userJoinDate, clazzType, checkin.checkinTime);

          const checkinMoment = moment(checkin.checkinTime),
              checkinEndMoment = moment(checkin.checkinTime).endOf("day").add(diffHour, 'hours');

          // 计算提前打卡时间 秒数
          checkin.aheadSeconds = checkinEndMoment.diff(checkinMoment, 'seconds');
          // 仅当打卡天数大于0时才计入学分
          if (clazzUtil.checkDateIsWithinClazzRange(checkin.checkinTime, clazzAccountRecordList)) {
            // 累加学分
            scoreSum += checkin.score;
          }

          // 去除无用数据
          delete checkin.score;
        });

        // 标记是否今天已打卡
        const hasCheckin = _.isEmpty(checkinList)
            ? false
            : clazzDayNumber === _.first(checkinList).dayNumber;

        const openDays = _.max([0, _.min([clazzDayNumber, moment(clazzEndDate).diff(clazzStartDate, 'days')])]);

        return {
          scoreSum: scoreSum,       // 课程获取学分
          openDays: openDays,       // 开班天数
          hasCheckin: hasCheckin,   // 当天是否已打卡
          checkins: checkinList,    // 打卡列表
        };
      });
};

/**
 * 根据id获取打卡item
 *
 * @param checkinId
 * @returns {*|Promise|Promise.<TResult>}
 */
pub.fetchCheckinById = (checkinId) => {
  return checkinMapper.fetchById(checkinId)
      .then((checkinItem) => {
        debug(checkinItem);

        return checkinItem;
      });
};

/**
 * 为打卡记录补充用户文件信息，标记是否已打卡
 *
 * @param checkinItem
 * @param withFileUrl     是否携带可访问url
 * @returns {*}
 */
pub.fillCheckinWithUserFiles = (checkinItem, withFileUrl) => {
  // 参数检查
  if (!_.isPlainObject(checkinItem)) {
    winston.error('填充checkin条目失败，参数错误！！！\n\tcheckinItem: %j', checkinItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const checkinMoment = moment(checkinItem.checkinTime),
      createMoment = moment(checkinItem.createdAt);

  // 获取打卡当天用户所提交的文件列表
  const queryUserFilePromise = userFileMapper.query({
    userId: checkinItem.userId,
    upTime: {$gte: checkinMoment.startOf('day').toDate(), $lte: checkinMoment.endOf('day').toDate()}
  });

  /*
   获取创建打卡当天用户提交的文件列表
   如果 打卡时间 和 创建打卡时间 为同一天则直接返回 []
   */
  const queryCreatedAtUserFilePromise = createMoment.isSame(checkinMoment, 'day')
      ? Promise.resolve([])
      : userFileMapper.query(
          {
            userId: checkinItem.userId,
            upTime: {$gte: createMoment.startOf('day').toDate(), $lte: createMoment.endOf('day').toDate()}
          });

  const fetchWechatFileUrlFunctionPromise = withFileUrl === true
      ? wechatFile.fetchWechatFileUrlFunction()
      : Promise.resolve(null);

  return Promise.all([queryUserFilePromise, queryCreatedAtUserFilePromise, fetchWechatFileUrlFunctionPromise])
      .then((results) => {
        const userFileList = _.flatten(_.take(results, 2)),
            getWechatFileUrl = results[2];

        debug(userFileList);

        const checkinFileKeys = _.get(checkinItem, ['checkinFiles', 'fileKeys'], []);
        _.forEach(userFileList, (fileItem) => {
          if (withFileUrl === true) {
            // 标记是否需要下载
            fileItem.downloadRequired = fileUtil.isUserFileNeedDownload(fileItem);
          } else {
            // 其他情况去除可访问链接
            delete fileItem.fileUrl;
          }

          fileItem.fileName = fileItem.fileName || null;
          fileItem.hasCheckined = _.includes(checkinFileKeys, fileItem.id);
        });

        checkinItem.userFiles = userFileList;

        checkinItem.checkinTime = moment(checkinItem.checkinTime).format('YYYY-MM-DD');

        // 筛选必要数据
        return _.pick(checkinItem, ['id', 'checkinTime', 'score', 'status', 'userFiles']);
      });
};

/**
 * 更新打卡记录中的checkinFiles字段
 * @param checkinItem
 * @param checkinFiles {{fileIds: [{userFileId}]}}
 */
pub.updateCheckinFiles = (checkinItem, checkinFiles) => {
  // 参数检查
  if (!_.isPlainObject(checkinItem) || !_.isPlainObject(checkinFiles) || _.isEmpty(checkinFiles.fileIds)) {
    winston.error('更新checkin条目信息失败，参数错误！！！\n\tcheckinItem: %j\n\tcheckinFiles: %j', checkinItem, checkinFiles);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  
  const checkinMoment = moment(checkinItem.checkinTime);
  // 获取用户打卡当天所提交的文件列表
  const queryCheckinTimeDateUserFilePromise = userFileMapper.query({
    userId: checkinItem.userId,
    upTime: {$gte: checkinMoment.startOf('day').toDate(), $lte: checkinMoment.endOf('day').toDate()}
  });

  let queryCheckinCreatedMomentUserFilePromise;
  // 如果为补打卡，则需要查询补打卡当天的文件列表
  const checkinCreatedMoment = moment(checkinItem.createdAt);
  if (checkinCreatedMoment.isSame(checkinMoment, 'day')) {
    queryCheckinCreatedMomentUserFilePromise = Promise.resolve([]);
  } else {
    queryCheckinCreatedMomentUserFilePromise = userFileMapper.query({
      userId: checkinItem.userId,
      upTime: {$gte: checkinCreatedMoment.startOf('day').toDate(), $lte: checkinCreatedMoment.endOf('day').toDate()}
    });
  }

  return Promise.all([queryCheckinCreatedMomentUserFilePromise, queryCheckinTimeDateUserFilePromise])
      .then((results) => {
        let userFileList = _.flatten(results);
        debug(userFileList);
        let userFileIds = _.map(userFileList, 'id'),
            checkinFileKeys = checkinFiles.fileIds;
        if (_.difference(checkinFileKeys, userFileIds).length !== 0) {
          winston.error('更新用户打卡 %s 失败，参数错误！！！\n\t用户文件列表: %j\n\t打卡文件列表：%j', checkinItem.id, userFileIds, checkinFileKeys);
          return Promise.reject(commonError.PARAMETER_ERROR());
        }

        return checkinMapper.updateById(checkinItem.id, {checkinFiles: {fileKeys: checkinFileKeys}})
      });
};

/**
 * 取消打卡记录
 *
 * @param checkinId
 * @returns {*}
 */
pub.destroyCheckinItem = (checkinId) => {
  if (_.isNil(checkinId)) {
    winston.error('删除checkin条目信息失败，参数错误！！！\n\tcheckinId: %s', checkinId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return checkinMapper.destroy(checkinId);
};

/**
 * 创建当天打卡记录
 *
 * @param userId
 * @param clazzId
 * @param checkinItem
 * @returns {*}
 */
pub.createClazzCheckinItem = (userId, clazzId, checkinItem) => {
  // 参数检查
  if (!_.isPlainObject(checkinItem) || _.isEmpty(checkinItem.fileIds) || !_.isDate(checkinItem.date)) {
    winston.error('创建用户当天打卡失败，参数错误！！！\n\tcheckinFiles: %j', checkinItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  let checkinMoment = moment(checkinItem.date);
  // 获取用户打卡当天所提交的文件列表
  let queryUserFilePromise = userFileMapper.query({
    userId: userId,
    upTime: {$gte: checkinMoment.startOf('day').toDate(), $lte: checkinMoment.endOf('day').toDate()}
  });

  let nowMoment = moment(),
      queryTodayUserFilePromise;
  if (nowMoment.isSame(checkinMoment, 'day')) {
    queryTodayUserFilePromise = Promise.resolve([]);
  } else {
    queryTodayUserFilePromise = userFileMapper.query({
      userId: userId,
      upTime: {$gte: nowMoment.startOf('day').toDate(), $lte: nowMoment.endOf('day').toDate()}
    });
  }

  return Promise.all([queryUserFilePromise, queryTodayUserFilePromise])
      .then((results) => {
        let userFileList = _.flatten(results);
        debug(userFileList);

        let userFileIds = _.map(userFileList, 'id'),
            checkinFileKeys = checkinItem.fileIds;

        if (_.difference(checkinFileKeys, userFileIds).length !== 0) {
          winston.error('创建用户当天打卡失败，参数错误！！！\n\t用户文件列表: %j\n\t打卡文件列表：%j', userFileIds, checkinFileKeys);
          return Promise.reject(commonError.PARAMETER_ERROR());
        }

        let newCheckinItem = {
          status: enumModel.checkinStatusEnum.NORMAL.key,
          checkinFiles: {fileKeys: checkinFileKeys},
          clazz: clazzId,
          isPublic: checkinItem.isPublic,
          remark: checkinItem.remark,
          title: checkinItem.title,
          score: 1, // todo 设置为系统设置
          userId: userId,
          checkinTime: checkinItem.date
        };

        if(!_.isNil(checkinItem.taskId)){
          newCheckinItem['taskId'] = checkinItem.taskId;
        }

        return checkinMapper.create(newCheckinItem);
      });
};

/**
 * 查询打卡列表
 *  userId和clazzId不能同时为空
 *
 * @param userId    用户id，
 * @param clazzId   班级id
 * @param startDate 开始日期
 * @param endDate   结束日期
 * @param idList    打卡id列表
 * @returns {*}
 */
pub.queryCheckinList = (userId, clazzId, startDate, endDate, idList) => {
  debug(userId);
  debug(clazzId);
  debug(startDate);
  debug(endDate);
  debug(idList);

  if ((_.isNil(userId) && _.isNil(clazzId) && _.isEmpty(idList)) || !_.isDate(startDate)) {
    winston.error('查询打卡列表失败！！！userId: %s clazzId: %s startDate: %s, idList: %j', userId, clazzId, startDate, idList);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  // 如果endDate存在且合法，则设置为结束时间；否则，设置为当前日期
  const queryEndDate = _.isDate(endDate) ? endDate : new Date();

  const queryParam = {
    checkinTime: {$gte: startDate, $lte: queryEndDate}
  };
  if (!_.isNil(userId)) {
    queryParam.userId = userId;
  }
  if (!_.isNil(clazzId)) {
    queryParam.clazz = clazzId;
  }
  if (!_.isNil(idList)) {
    queryParam['_id'] = idList;
  }

  return checkinMapper.queryCheckinList(queryParam);
};

/**
 * 分页获取打卡参数检查器
 *
 * @param clazzId
 * @param date
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<boolean>}
 */
const pagedQueryParamValidator = (clazzId, date, pageNumber, pageSize) => {
  const isQueryParamValid = !_.isNil(clazzId) && (_.isNil(date) || _.isDate(date)) && _.isSafeInteger(pageNumber) && _.isSafeInteger(pageSize);

  return Promise.resolve(isQueryParamValid);
};

/**
 * 根据关键词查询班级在某天的打卡分页记录
 *
 * @param clazzId     班级id
 * @param queryDate   日期
 * @param keyword     关键词
 * @param pageNumber  页数
 * @param pageSize    页面大小
 * @returns {*}
 */
pub.fetchClazzCheckinPagedListByKeyword = (clazzId, queryDate, keyword, pageNumber, pageSize) => {
  // 参数检查
  return pagedQueryParamValidator(clazzId, queryDate, pageNumber, pageSize)
      .then((isParamsValid) => {
        if (isParamsValid !== true || _.isEmpty(keyword)) {
          winston.error('获取班级打卡列表失败，参数错误！！！ clazzId: %s, queryDate: %s, pageNumber: %s, pageSize: %s, keyword: %s', clazzId, queryDate, pageNumber, pageSize, keyword);
          return Promise.reject(commonError.PARAMETER_ERROR());
        }

        // 根据关键字，查询班级用户列表
        return clazzAccountService.searchClazzUsers(clazzId, joinedClazzAccountStatusList, keyword, []);
      })
      .then((clazzUserList) => {
        const userIdList = _.map(clazzUserList, 'id'),
            queryDateMoment = moment(queryDate);

        const queryParam = {
          clazz: clazzId,
          checkinTime: {
            $gte: queryDateMoment.startOf('day').toDate(),
            $lte: queryDateMoment.endOf('day').toDate()
          },
          userId: userIdList
        };

        // 查询用户在班级内的打卡记录
        return checkinMapper.queryPageCheckinList(queryParam, pageNumber, pageSize)
            .then((pagedCheckinListResult) => {
              // 匹配用户到打卡项目中
              pagedCheckinListResult.values = clazzUtil.fillCheckinWithUser(pagedCheckinListResult.values, clazzUserList);

              return pagedCheckinListResult;
            });
      });
};

/**
 * 查询班级在某天的打卡分页记录
 *
 * @param clazzId     班级id
 * @param queryDate   日期
 * @param pageNumber  页数
 * @param pageSize    页面大小
 * @returns {Promise.<TResult>|Promise}
 */
pub.fetchClazzCheckinPagedList = async (clazzId, queryDate, pageNumber, pageSize, queryParam = {}) => {
  // 参数检查
  const isParamsValid = await pagedQueryParamValidator(clazzId, queryDate, pageNumber, pageSize)
  if (isParamsValid !== true) {
    winston.error(
        '获取班级打卡列表失败，参数错误！！！ clazzId: %s, queryDate: %s, pageNumber: %s, pageSize: %s',
        clazzId,
        queryDate,
        pageNumber,
        pageSize
    );
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  queryParam.clazz = clazzId;
  if (queryDate != null) {
    let queryDateMoment = moment(queryDate);
    queryParam.checkinTime= {
      $gte: queryDateMoment.startOf('day').toDate(),
      $lte: queryDateMoment.endOf('day').toDate()
    };
  }
  // 禅勋班级打卡列表
  let pagedCheckinListResult = await checkinMapper.queryPageCheckinList(queryParam, pageNumber, pageSize);
  let checkinList = pagedCheckinListResult.values;
  const userIds = _.map(checkinList, 'userId');
  // 获取打卡学员列表
  const userList = await userService.queryUser(null, userIds)
  checkinList = clazzUtil.fillCheckinWithUser(checkinList, userList);
  console.log(checkinList);
  for (let i=0; i< checkinList.length; i++) {
    if (!_.isNil(checkinList[i].reviews)) {
      for (let j=0; j< checkinList[i].reviews.length; j++){
        if (!_.isNil(checkinList[i].reviews[j].audioId)) {
          checkinList[i].reviews[j].audio = await userFileService.fetchUserFileById(checkinList[i].reviews[j].audioId);
        }
      }
    }
  }
  pagedCheckinListResult.values = checkinList;
  return pagedCheckinListResult;
 
};

/**
 * 分页查询班级内某天未打卡学员列表
 *
 * @param clazzId
 * @param date
 * @param pageNumber
 * @param pageSize
 * @param keyword
 * @returns {*}
 */
pub.queryPagedClazzUncheckins = (clazzId, date, pageNumber, pageSize, keyword) => {
  if (_.isNil(clazzId) || !_.isDate(date) || !_.isSafeInteger(pageNumber) || !_.isSafeInteger(pageSize)) {
    winston.error('获取班级未打卡列表失败，参数错误！！！ clazzId: %s, date: %s, pageNumber: %s, pageSize: %s, keyword: %s', clazzId, date, pageNumber, pageSize, keyword);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return checkinMapper.queryCheckinList(
      {
        clazz: clazzId,
        checkinTime: {$gte: moment(date).startOf('day').toDate(), $lte: moment(date).endOf('day').toDate()},
      })
      .then((checkinList) => {
        debug(checkinList);

        const excludedUserIds = _.map(checkinList, 'userId');

        debug(excludedUserIds);

        return clazzAccountService.searchPagedClazzAccounts(
            clazzId,
            joinedClazzAccountStatusList,
            keyword,
            pageNumber,
            pageSize,
            excludedUserIds
        );
      });
};

/**
 * 根据checkinId更新打卡信息
 *
 * @param checkinId
 * @param checkinItem
 * @returns {Promise|Promise.<*>}
 */
pub.updateCheckinItem = (checkinId, checkinItem) => {
  // 参数检查
  if (_.isNil(checkinId) || !_.isPlainObject(checkinItem)) {
    winston.error('更新checkin条目信息失败，参数错误！！！\n\tcheckinId: %s\n\tcheckinItem: %j', checkinId, checkinItem);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return checkinMapper.updateById(checkinId, checkinItem);
};

/**
 * 查询班级未打卡学员列表
 *
 * @param clazzId
 * @param queryDate
 * @param keyword
 * @returns {*}
 */
pub.queryClazzUncheckinUserList = (clazzId, queryDate, keyword) => {
  if (_.isNil(clazzId) || !_.isDate(queryDate)) {
    winston.error('获取班级未打卡列表失败，参数错误！！！ clazzId: %s, queryDate: %s', clazzId, queryDate);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  return checkinMapper.queryCheckinList(
      {
        clazz: clazzId,
        checkinTime: {$gte: moment(queryDate).startOf('day').toDate(), $lte: moment(queryDate).endOf('day').toDate()},
      })
      .then((checkinList) => {
        debug(checkinList);

        const excludedUserIds = _.map(checkinList, 'userId');

        debug(excludedUserIds);

        return clazzAccountService.searchClazzUsers(
            clazzId,
            joinedClazzAccountStatusList,
            keyword,
            excludedUserIds
        );
      });
};


/**
 * 获取用户打卡的天数
 */
pub.getUserCheckinDays = (userId) => {
  if (_.isNil(userId)) {
    winston.error('参数错误！！！ userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  return checkinMapper.sumCheckinDay(userId)
      .then((result) => {
        debug(result);
        if(_.isNil(result[0])){
          return 0;
        }else{
          return result[0].count;
        }
      });
};

pub.like = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error('参数错误！！！ userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const likeArr = checkin.likeArr || [];
  if (likeArr.includes(userId)) {
    return Promise.reject(commonError.BIZ_FAIL_ERROR("已点赞过该打卡"));
  } else {
    likeArr.push(userId);
    return checkinMapper.updateById(checkin.id, {likeArr: likeArr})
  }
};

pub.cancelLike = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error('参数错误！！！ userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const likeArr = checkin.likeArr || [];
  likeArr.pop(userId);
  return checkinMapper.updateById(checkin.id, {likeArr: likeArr})
};

pub.dislike = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error('参数错误！！！ userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const dislikeArr = checkin.dislikeArr || [];
  if (dislikeArr.includes(userId)) {
    return Promise.reject(commonError.BIZ_FAIL_ERROR("已点踩过该打卡"));
  } else {
    dislikeArr.push(userId);
    return checkinMapper.updateById(checkin.id, {dislikeArr: dislikeArr})
  }
};

pub.cancelDislike = (userId, checkin) => {
  if (_.isNil(userId)) {
    winston.error('参数错误！！！ userId: %s', userId);
    return Promise.reject(commonError.PARAMETER_ERROR());
  }
  const dislikeArr = checkin.dislikeArr || [];
  dislikeArr.pop(userId);
  return checkinMapper.updateById(checkin.id, {dislikeArr: dislikeArr})
};

/**
 * 创建打卡点评
 */
pub.createReview = async (checkin, review) => {
  const imageUserFile = await userFileMapper.fetchById(review.image);
  if (!_.isNil(imageUserFile)) {
    review.image = imageUserFile.fileUrl;
  }
  let reviews = checkin.reviews || [];
  reviews.push(review);
  return checkinMapper.updateById(checkin.id, {reviews: reviews, hasReviews: true})
}

/**
 * 删除打卡点评
 */
pub.deleteReview = async (checkin, reviewId) => {
  const reviews = _.reject(checkin.reviews, review => review.id == reviewId)
  return checkinMapper.updateById(checkin.id, 
    {
      reviews: reviews, 
      hasReviews: reviews.length > 0
    })
}

module.exports = pub;
