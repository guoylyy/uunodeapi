'use strict';

const _ = require('lodash');
const Joi = require('joi').extend(require('joi-date-extensions'));

const enumModel = require('../../../services/model/enum');
const pagedBaseSchema = require('./paged.base.schema');
const commonSchema = require('../../common.schema');

const pub = {};

/**
 * 查询课程列表query schema
 * @type {*}
 */
pub.clazzQuerySchema = Joi.object().keys({
  status: Joi.string().valid(_.keys(enumModel.clazzStatusEnum)).valid('').empty(''),
  name: Joi.string().empty('')
});

/**
 * 查询班级学员列表query schema
 */
pub.clazzStudentsQuerySchema = pagedBaseSchema.keys({
  status: Joi.string().valid(_.keys(enumModel.clazzJoinStatusEnum)).empty(''),
  keyword: Joi.string().empty('')
});

/**
 * 查询班级打卡记录query schema
 */
pub.checkinQuerySchema = pagedBaseSchema.keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').allow('').empty('').default(Date, 'current date'),
  keyword: Joi.string().empty('')
});

/**
 * 查询班级任务列表query Schema
 */
pub.clazzTaskesQuerySchema = pagedBaseSchema.keys({
  title: Joi.string().max(32).empty('')
});

/**
 * 查询反馈列表query schema
 */
pub.feedbackQuerySchema = pagedBaseSchema.keys({
  status: Joi.string().valid(_.keys(enumModel.clazzFeedbackStatusEnum)).empty(''),
  keyword: Joi.string().max(16).empty('')
});

/**
 * 审核用户body schema
 */
pub.verifyClazzAccountBodySchema = Joi.object().keys({
  status: Joi.string().valid(_.keys(enumModel.clazzJoinStatusEnum)).required(),
  joinDate: Joi.date().max('now').required(),
  isNotify: Joi.boolean().default(false)
});

/**
 * 学员换班body schema
 */
pub.changeAccountClazzBodySchema = Joi.object().keys({
  clazzId: commonSchema.mongoIdSchema.required()
});

/**
 * 编辑课程任务body Schema
 */
pub.editClazzTaskItemBodySchema = Joi.object().keys({
  title: Joi.string().max(64).required(),
  coverPic: Joi.string().empty(''),
  taskType:Joi.string().default('V1'),
  shareType: Joi.string().max(64).empty(''),
  teacher:Joi.object().keys(
      {
      id:Joi.string().max(128).required(),
      name: Joi.string().max(64).required(),
      headImgUrl: Joi.string().max(512).required()
      }
  ),
  materials: Joi.array().items(commonSchema.mongoIdSchema).unique().required(),
  introductions: Joi.array().items(
      Joi.object().keys(
          {
            type: Joi.string().valid(_.keys(enumModel.clazzTaskIntroductionTypeEnum)).required(),
            content: Joi.string().allow('').required(),
          }
      )
  ).required()
});

/**
 * 任务素材查询query schema
 */
pub.taskMaterialQuerySchema = pagedBaseSchema.keys({
  type: Joi.string().valid(_.keys(enumModel.materialTypeEnum)).required(),
  keyword: Joi.string().empty('')
});

/**
 * 创建任务素材body schema
 * @type {*}
 */
pub.createTaskMaterialBodySchema = Joi.object().keys({
  title: Joi.string().required(),
  type: Joi.string().valid(_.keys(enumModel.materialTypeEnum)).required(),
  description: Joi.string().allow('').allow(null),
  attachId: commonSchema.mongoIdSchema.required()
});

/**
 * 复制素材列表body schema
 * @type {*}
 */
pub.duplicateMaterialsBodySchema = Joi.object().keys({
  ids: Joi.array().unique().items(commonSchema.mongoIdSchema.required()).required()
});

/**
 * 推送任务查询query schema
 */
pub.clazzPostQuerySchema = pagedBaseSchema.keys({
  keyword: Joi.string().empty('')
});

/**
 * 创建推送任务body schema
 */
pub.clazzPostCreateSchema = Joi.object().keys({
  title: Joi.string().max(64).required(),
  taskId: commonSchema.mongoIdSchema.required(),
  targetDate: Joi.date().required(),
  stickied: Joi.boolean().default(false)
});

/**
 * 更新推送任务body schema
 */
pub.clazzPostUpdateSchema = Joi.object().keys({
  title: Joi.string().max(64).required()
});

/**
 * 查询笃师一对一反馈素材列表query schema
 */
pub.feedbackMaterialQuerySchema = pagedBaseSchema.keys({
  keyword: Joi.string().empty('')
});

/**
 * 笃师一对一反馈素材编辑body schema
 */
pub.feedbackMaterialEditSchema = Joi.object().keys({
  title: Joi.string().required(),
  content: Joi.string().required()
});

/**
 * 查询打卡情况
 */
pub.queryCheckinStatusSchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date')
});

/**
 * 创建打卡body schema
 */
pub.createCheckinBodySchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date'),
  fileIds: Joi.array().items(commonSchema.mongoIdSchema.required()).required()
});

/**
 * 更新打卡body schema
 */
pub.updateCheckinBodySchema = Joi.object().keys({
  status: Joi.string().valid(_.keys(enumModel.checkinStatusEnum)),
  score: Joi.number().integer(),
  isNotify: Joi.boolean().default(false),
  remark: Joi.string().max(512).allow(['', null])
});

/**
 * 同步学员信息body schema
 */
pub.syncStudentsInfoBodySchema = Joi.object().keys({
  status: Joi.string().valid(_.keys(enumModel.clazzJoinStatusEnum)).empty(''),
  keyword: Joi.string().empty('')
});

/**
 * 更新班级账户
 */
pub.updateClazzAccountRecordListBodySchema = Joi.array().items(Joi.object().keys({
  startDate: Joi.date().format('YYYY-MM-DD').required(),
  endDate: Joi.date().format('YYYY-MM-DD').required()
}));

/**
 * 查询班级抽打卡详情
 */
pub.queryClazzLuckyChekinSchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').default(() => new Date(), 'current date')
});

/**
 * 新建班级抽打卡记录
 */
pub.createClazzLuckyCheckinSchema = Joi.object().keys({
  date: Joi.date().format('YYYY-MM-DD').max('now').required(),
  luckyNumber: Joi.number().integer().positive().required(),
});

/**
 * 新建笃师一对一回复query schema
 */
pub.feedbackReplyQuerySchema = Joi.object().keys({
  pageSize: Joi.number().integer().min(0).default(1024)
});


/**
 * 推送 query schema
 */
pub.previewTaskSchema = Joi.object().keys({
  studentNumber: Joi.string()
});

/**
 * 新建笃师一对一回复body schema
 *
 * @type {*}
 */
pub.feedbackReplySchema = Joi.object().keys({
  replyType: Joi.string().valid(_.keys(enumModel.clazzFeedbackReplyTypeEnum)).required(),
  content: Joi.string().max(1024).when(
      'replyType',
      {
        is: enumModel.clazzFeedbackReplyTypeEnum.TEXT.key,
        then: Joi.required()
      }
  ),
  materialId: Joi.string().regex(/^[a-f\d]{24}$/i).when(
      'replyType',
      {
        is: enumModel.clazzFeedbackReplyTypeEnum.MATERIAL.key,
        then: Joi.required()
      }
  ),
  attachId: Joi.string().regex(/^[a-f\d]{24}$/i).when(
      'replyType',
      {
        is: enumModel.clazzFeedbackReplyTypeEnum.VOICE.key,
        then: Joi.required()
      }
  ),
}).xor('content', 'materialId', 'attachId');

module.exports = pub;
