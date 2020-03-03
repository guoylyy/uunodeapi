"use strict";

/**
 * 数据查询相关方法，用于统一向service层提供Promise返回及封装dao层具体实现
 */
const _ = require("lodash");
const debug = require("debug")("mapper");

const taskCheckinSchema = require("./schema/biyiTaskCheckin.schema");
const queryUtil = require("../util/queryUtil");
const mongoUtil = require("../util/mongoUtil");
const winston = require("winston");
const moment = require('moment');
const QUERY_SAFE_PARAMS = [
  "_id",
  "userId",
  "taskId",
  "yearMonth",
  "task.language",
  "task.oppoLanguage",
  "task.theme",
  "viewLog"
];
const QUERY_SELECT_COLUMNS = queryUtil.disposeSelectColumn([
  "translationText",
  "wordCount",
  "practiceTime",
  "userId",
  "likeArr",
  "createdAt",
  "task",
  "taskId",
  "viewLog"
]);
const QUERY_ORDER_BY = queryUtil.disposeSortBy([
  { column: "createdAt", isDescending: true }
]);

const pub = {};

/**
 * 打卡列表 分页
 * @param queryParam
 * @param pageNumber
 * @param pageSize
 * @returns {Promise.<TResult>}
 */
pub.queryPagedCheckinList = (queryParam, pageNumber = 1, pageSize = 10) => {
  return taskCheckinSchema.queryPaged(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    pageNumber,
    pageSize,
    QUERY_ORDER_BY
  );
};

/**
 * 打卡列表 不分页
 */
pub.queryCheckinList = queryParam => {
  return taskCheckinSchema.queryList(
    queryParam,
    QUERY_SAFE_PARAMS,
    QUERY_SELECT_COLUMNS,
    QUERY_ORDER_BY
  );
};

/**
 * 创建打卡
 */
pub.checkin = taskCheckin => {
  taskCheckin.yearMonth = moment().format('YYYYMM');
  return taskCheckinSchema.createItem(taskCheckin);
};

/**
 * 根据id更新taskCheckin
 */
const safeUpdateParamList = ["likeArr", "translationText", "viewLog", "wordCount"]; // 限制可更新的字段
pub.updateById = (taskCheckinId, taskCheckin) => {
  const pickedCheckinItem = mongoUtil.pickUpdateParams(
    taskCheckin,
    safeUpdateParamList
  );

  return taskCheckinSchema.updateItemById(taskCheckinId, pickedCheckinItem);
};

/**
 * 获取打卡详情
 */
pub.findById = taskCheckinId => {
  return taskCheckinSchema.findItemById(taskCheckinId);
};

/**
 *  统计数量 未删除
 */
pub.countByParam = param => {
  param.isDelete = false;
  return taskCheckinSchema.count(param);
};

/**
 * 根据id删除打卡记录
 */
pub.deleteById = id => {
  return taskCheckinSchema.destroyItem(id);
};


/**
 * 统计单个用户的每天打卡数量
 */
pub.sumGroupByUserIdAndDate = (userId, beforeDays) => {
  const queryDate = moment().subtract('days', beforeDays).toDate();
  return taskCheckinSchema.aggregate([
    {$match: {'userId': userId, 'createdAt': {$gte: queryDate}, 'isDelete': false}},
    {$project: {'date': {$dateToString: {format: "%Y-%m-%d", date: {$add: ["$createdAt", 8 * 3600000]}}}}},
    {$group: {_id: "$date", quantity: {$sum: 1}}},
    {$project: {_id: null, date:'$_id', quantity:'$quantity'}},
    {$sort: {date: 1}}
  ]);
};

/**
 * 统计某天练习时长
 */
pub.sumTodayPracticeTime = (userId) => {
  const queryDate = moment().format('YYYY-MM-DD');
  return taskCheckinSchema.aggregate([
    {$match: {'userId': userId, 'isDelete': false}},
    {$project: 
			{
				'date': {$dateToString: {format: "%Y-%m-%d", date: {$add: ["$createdAt", 8 * 3600000]}}}, 
				'practiceTime': '$practiceTime'
			}
		},
		{$match: {'date': queryDate}},
    {$group: {_id: null, practiceTime: {$sum: '$practiceTime'}}},
  ]);
}

/**
 * 统计练习时长
 */
pub.sumPracticeTime = (userId) => {
	return taskCheckinSchema.aggregate([
    {$match: {'userId': userId, 'isDelete': false}},
    {$group: {_id: null, practiceTime: {$sum: '$practiceTime'}}},
  ]);
}

/**
 * 根据源语统计词数
 */
pub.sumWordCountByLanguage = userId => {
  return taskCheckinSchema.aggregate([
    {$match: {'userId': userId, 'isDelete': false}},
    {$group: {_id: "$task.language", wordCount: {$sum: '$wordCount'}}},
    {$project: {_id: null, language:'$_id', wordCount:'$wordCount'}},
  ]);
}

/**
 * 统计打卡天数
 */
pub.sumCheckinDaysByUserId = userId => {
  return taskCheckinSchema.aggregate([
    {$match: {'userId': userId, 'isDelete': false}},
    {$project: 
      {
        'date': {$dateToString: {format: "%Y-%m-%d", date: {$add: ["$createdAt", 8 * 3600000]}}}, 
      }
    },
    {$group: {_id: "$date"}},
    {$group: {_id: null, count: {$sum: 1}}}
  ])
}

/**
 * 我的排行榜-打卡周排行榜
 */
pub.checkinWeekRank = (limit = 100)=> {
  return taskCheckinSchema.aggregate([
    {$match: {'isDelete': false}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, practiceTime: '$practiceTime', userId: '$userId'}},
    {$match: {'yearWeek': moment().format('YYYY-WW')}},
    {$group: {_id: "$userId", practiceTime: {$sum: '$practiceTime'}}},
    {$sort: {'practiceTime': -1}},
    {$limit: limit },
    {$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
		{$project: { _id: '$items._id', practiceTime: '$items.practiceTime', rank: {$add: ['$items.rank', 1]}}},
  ]);
}

/**
 * 我的排行榜-笔芯周排行榜
 */
pub.likeCountWeekRank = (limit = 100) =>{
  return taskCheckinSchema.aggregate([ 
    {$match: {'isDelete': false}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, likeCount: {$size: '$likeArr'}, userId: '$userId'}},
    {$match: {'yearWeek': moment().format('YYYY-WW')}},
    {$group: {_id: "$userId", likeCount: {$sum: '$likeCount'}}},
    {$sort: {'likeCount': -1}},
    {$limit: limit },
    {$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
		{$project: { _id: '$items._id', likeCount: '$items.likeCount', rank: {$add: ['$items.rank', 1]}}},
  ])
}

pub.myCheckinWeekData = (userId) => {
  return taskCheckinSchema.aggregate([
    {$match: {'isDelete': false}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, practiceTime: '$practiceTime', userId: '$userId'}},
    {$match: {'yearWeek': moment().format('YYYY-WW')}},
    {$group: {_id: "$userId", practiceTime: {$sum: '$practiceTime'}}},
    {$sort: {'practiceTime': -1}},
    // {$limit: limit },
    {$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
    {$project: { _id: '$items._id', practiceTime: '$items.practiceTime', rank: {$add: ['$items.rank', 1]}}},
    {$match: {_id: userId}}
  ]);
}

pub.myLikeCountWeekData = (userId) => {
  return taskCheckinSchema.aggregate([ 
    {$match: {'isDelete': false}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, likeCount: {$size: '$likeArr'}, userId: '$userId'}},
    {$match: {'yearWeek': moment().format('YYYY-WW')}},
    {$group: {_id: "$userId", likeCount: {$sum: '$likeCount'}}},
    {$sort: {'likeCount': -1}},
    // {$limit: limit },
    {$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
    {$project: { _id: '$items._id', likeCount: '$items.likeCount', rank: {$add: ['$items.rank', 1]}}},
    {$match: {_id: userId}}
  ])
}

/**
 * 学校排行榜-打卡周排行榜
 */
pub.schoolCheckinWeekRank = (limit = 1000)=> {
  return taskCheckinSchema.aggregate([ 
    {$match: {'isDelete': false}},
		{$lookup: {
			"localField": "userId",
			"from": "WeUser",
			"foreignField": "userId",
			"as": "user"
		}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, practiceTime: '$practiceTime', school: { $arrayElemAt: [ '$user.school', 0 ] }}},
    {$match: {'yearWeek': moment().format('YYYY-WW'), 'school': {$ne:null}}},
    {$group: {_id: "$school", practiceTime: {$sum: '$practiceTime'}}},
		{$sort: {'practiceTime': -1}},
		{$limit: limit},
		{$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
		{$project: { _id: '$items._id', practiceTime: '$items.practiceTime', rank: {$add: ['$items.rank', 1]}}},
  ]);
}

/**
 * 学校排行榜-打卡周排行榜
 */
pub.mySchoolCheckinWeekData = (school)=> {
  return taskCheckinSchema.aggregate([ 
    {$match: {'isDelete': false}},
		{$lookup: {
			"localField": "userId",
			"from": "WeUser",
			"foreignField": "userId",
			"as": "user"
		}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, practiceTime: '$practiceTime', school: { $arrayElemAt: [ '$user.school', 0 ] }}},
    {$match: {'yearWeek': moment().format('YYYY-WW'), 'school': {$ne:null}}},
    {$group: {_id: "$school", practiceTime: {$sum: '$practiceTime'}}},
		{$sort: {'practiceTime': -1}},
		{$limit: 1000},
		{$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
    {$project: { _id: '$items._id', practiceTime: '$items.practiceTime', rank: {$add: ['$items.rank', 1]}}},
    {$match: {_id: school}}
  ]);
}

/**
 * 
 */
pub.schoolLikeCountWeekRank = (limit = 1000) => {
  return taskCheckinSchema.aggregate([ 
    {$match: {'isDelete': false}},
		{$lookup: {
			"localField": "userId",
			"from": "WeUser",
			"foreignField": "userId",
			"as": "user"
		}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, likeCount: {$size: '$likeArr'}, school: { $arrayElemAt: [ '$user.school', 0 ] }}},
    {$match: {'yearWeek': moment().format('YYYY-WW'), 'school': {$ne:null}}},
    {$group: {_id: "$school", likeCount: {$sum: '$likeCount'}}},
		{$sort: {'likeCount': -1}},
		{$limit: 1000},
		{$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
    {$project: { _id: '$items._id', likeCount: '$items.likeCount', rank: {$add: ['$items.rank', 1]}}},
  ]);
}

pub.mySchoolLikeCountWeekData = (school) => {
  return taskCheckinSchema.aggregate([ 
    {$match: {'isDelete': false}},
		{$lookup: {
			"localField": "userId",
			"from": "WeUser",
			"foreignField": "userId",
			"as": "user"
		}},
    {$project: {yearWeek: {$dateToString: {format: "%Y-%V", date: {$add: ["$createdAt", 8 * 3600000]}}}, likeCount: {$size: '$likeArr'}, school: { $arrayElemAt: [ '$user.school', 0 ] }}},
    {$match: {'yearWeek': moment().format('YYYY-WW'), 'school': {$ne:null}}},
    {$group: {_id: "$school", likeCount: {$sum: '$likeCount'}}},
		{$sort: {'likeCount': -1}},
		{$limit: 1000},
		{$group: {_id: null, items: {$push: '$$ROOT'}}},
		{$unwind: { "path": "$items", "includeArrayIndex": "items.rank" } },
    {$project: { _id: '$items._id', likeCount: '$items.likeCount', rank: {$add: ['$items.rank', 1]}}},
    {$match: {_id: school}}
  ]);
}

module.exports = pub;
