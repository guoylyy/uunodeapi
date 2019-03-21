'use strict';

/**
 * 推广相关API
 */

const _ = require('lodash');
const debug = require('debug')('controller');

const apiRender = require('../render/api.render');

const apiUtil = require('../util/api.util');

const schemaValidator = require('../schema.validator');
const promotionSchema = require('./schema/promotion.schema');

const enumModel = require('../../services/model/enum');
const commonError = require('../../services/model/common.error');

const clazzService = require('../../services/clazz.service');
const userService = require('../../services/user.service');
const promotionService = require('../../services/promotion.service');

const pub = {};

pub.queryPromototionIncomeList = (req, res) => {
  return schemaValidator.validatePromise(promotionSchema.promotionIncomeQuerySchema, req.query)
      .then((queryParam) => {
        debug(queryParam);

        const { studentNumber, status, pageNumber, pageSize } = queryParam;

        return _.isNil(studentNumber)
            ? promotionService.queryPagedPromotionIncomes(null, status, pageNumber, pageSize)
            : userService.queryUserBySearchType(enumModel.userSearchTypeEnum.STUDENT_NUMBER.key, studentNumber, null)
                .then((userList) => {
                  debug(userList);
                  const userIdList = _.map(userList, 'id');

                  return promotionService.queryPagedPromotionIncomes(userIdList, status, pageNumber, pageSize);
                });
      })
      .then((pagedPromotionIncome) => {
        const { values } = pagedPromotionIncome;

        if (_.isEmpty(values)) {
          return pagedPromotionIncome;
        }

        const clazzIdList = _.map(values, 'clazzId');
        const userIds = _.reduce(
            values,
            (prev, promotionItem) => _.concat(prev, promotionItem.promoterUserId, promotionItem.inviteeUserId),
            []
        );

        debug(clazzIdList);
        debug(userIds);

        const queryClazzListPromise = clazzService.queryClazzes(null, clazzIdList, null, null);
        const queryUserListPromose = userService.queryUser('', userIds);

        return Promise.all([queryClazzListPromise, queryUserListPromose])
            .then(([clazzList, userList]) => {
              const clazzMap = _.keyBy(clazzList, 'id');
              const userMap = _.keyBy(userList, 'id');

              debug(clazzMap);
              debug(userMap);

              pagedPromotionIncome.values = values.map((promotionItem) => {
                promotionItem.clazzInfo = clazzMap[promotionItem.clazzId];

                const pickedItem = apiUtil.pickPromotionUserIncomeBasicInfo(promotionItem);
                pickedItem.promoterUserInfo = apiUtil.pickUserBasicInfo(userMap[promotionItem.promoterUserId]);
                pickedItem.inviteeUserInfo = apiUtil.pickUserBasicInfo(userMap[promotionItem.inviteeUserId]);

                return pickedItem;
              });

              return pagedPromotionIncome;
            });
      })
      .then((pagedPromotionIncome) => {
        debug(pagedPromotionIncome);

        return apiRender.renderPageResult(res, pagedPromotionIncome.values, pagedPromotionIncome.itemSize, pagedPromotionIncome.pageSize, pagedPromotionIncome.pageNumber);
      })
      .catch(req.__ERROR_HANDLER);
};

module.exports = pub;
