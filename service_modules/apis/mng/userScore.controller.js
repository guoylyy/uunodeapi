'use strict';

const _ = require('lodash');
const debug = require('debug')('controller');
const Promise = require('bluebird');

const apiRender = require('../render/api.render');

const schemaValidator = require('../schema.validator');
const userSchema = require('./schema/user.schema');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const checkinService = require('../../services/checkin.service');
const userScoreService = require('../../services/userScore.service');
const clazzAccountService = require('../../services/clazzAccount.service');

const pub = {};

const updateUserScoreTarget = (userId, clazzId, userScoreItem) => {
  if (_.isNil(userId) || _.isNil(clazzId) || !_.isPlainObject(userScoreItem)) {
    return Promise.reject(commonError.PARAMETER_ERROR());
  }

  const userScoreType = userScoreItem.type,
      targetId = userScoreItem.targetId;
  switch (userScoreType) {
    case enumModel.userScoreTypeEnum.CHECKIN_REVIEW.key:
      return userScoreService.calculateUserScore(userId, clazzId, userScoreType, targetId)
          .then((targetScore) => {
            return checkinService.updateCheckinItem(targetId, { userScore: targetScore });
          });
    default:
      return Promise.resolve(null);
  }
};

/**
 * 创建打卡评分
 *
 * @param req
 * @param res
 * @returns {Promise.<T>|Promise}
 */
pub.updateClazzScoreRecord = (req, res) => {
  const currentClazzUserScore = req.__CURRENT_CLAZZ_USER_SCORE;

  const userId = currentClazzUserScore.userId,
      clazzId = req.__CURRENT_CLAZZ.id;

  return schemaValidator.validatePromise(userSchema.clazzUserScoreUpdateSchema, req.body)
      .then((clazzUserScore) => {
        debug(clazzUserScore);

        return userScoreService.updateUserScoreRecord(currentClazzUserScore.id, clazzUserScore.score, clazzUserScore.remark);
      })
      .then((userScoreRecord) => {
        debug(userScoreRecord);

        const updateTargetPromise = updateUserScoreTarget(userId, clazzId, currentClazzUserScore);

        // todo 抽取方法
        const queryClazzAccountPromise = clazzAccountService.queryClazzAccountByClazzId(clazzId, userId)
            .then(_.head);
        const calculateClazzScorePromise = userScoreService.sumClazzScore(userId, clazzId);

        const updateClazzScorePromise = Promise.all([queryClazzAccountPromise, calculateClazzScorePromise])
            .then(([clazzAccount, clazzScore,]) => {
              debug(clazzAccount);

              if (_.isNil(clazzAccount)) {
                return Promise.reject(commonError.BIZ_FAIL_ERROR('不存在的clazzAccount帐号'));
              }

              return clazzAccountService.update({
                id: clazzAccount.id,
                clazzScore: clazzScore
              });
            });

        return Promise.all([updateTargetPromise, updateClazzScorePromise])
      })
      .then((result) => {
        debug(result);

        return apiRender.renderSuccess(res);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
