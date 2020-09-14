'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const clazzSchema = require('./schema/clazz.schema');
const commonSchema = require('../common.schema');

const postService = require('../../services/post.service');

let pub = {};

/**
 * 分页查询班级推送任务
 *
 * @param req
 * @param res
 */
pub.listPagedPosts = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.clazzPostQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);
        return postService.listPagedPosts(req.__CURRENT_CLAZZ.id, queryParam.pageNumber, queryParam.pageSize, queryParam.keyword);
      })
      .then((result) => {
        // 数据筛选
        let pickedPosts = _.map(result.values, (post) => _.pick(post, ['id', 'status', 'title', 'postType', 'targetDate', 'result', 'canTry']));
        // render数据
        return apiRender.renderPageResult(res, pickedPosts, result.itemSize, result.pageSize, result.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 从班级任务中建立推送任务
 *
 * @param req
 * @param res
 */
pub.createPostFromClazzTask = (req, res) => {
  schemaValidator.validatePromise(clazzSchema.clazzPostCreateSchema, req.body)
      .then((postItem) => {
        debug(postItem);

        return postService.createFromClazzTask(req.__CURRENT_CLAZZ.id, postItem);
      })
      .then((postItem) => {
        debug(postItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

/**
 * 移除推送任务
 *
 * @param req
 * @param res
 */
pub.deletePost = (req, res) => {
  schemaValidator.validatePromise(commonSchema.emptySchema, req.body)
      .then((postItem) => {
        return postService.deleteClazzPost(req.__CURRENT_CLAZZ.id, req.params.postId);
      })
      .then((postItem) => {
        debug(postItem);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
