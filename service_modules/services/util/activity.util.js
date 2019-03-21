'use strict';

'use strict';

const _ = require('lodash');
const debug = require('debug')('util');

const enumModel = require('../model/enum');

const splitIntoAcvitiyRoomCandidate = (activityAccountList) => {
  const roomNumber = _.toInteger(_.size(activityAccountList) / 2);

  return _.chain(activityAccountList)
      .sampleSize(roomNumber * 2)
      .chunk(2)
      .value();
};

const pub = {};

/**
 * 1. 获取待分配用户列表
 * 2. 将用户分成  男->未知 男->男 男->女 女->未知 女->男 女->女 六组
 * 3. 首先匹配 男->男 女->女 列表，其中剩余的用户无法继续处理
 * 4. 将 男->女 与 女->男 互相匹配
 * 5. 剩余的 男->女 与 女->未知 匹配
 * 6. 剩余的 女->男 与 男->未知 匹配
 * 7. 剩余的 女->未知 男->未知 打乱再匹配
 *
 * @param activityAccountList
 * @returns {Array}
 */
pub.matchActivityAccount = (activityAccountList) => {
  debug(_.size(activityAccountList));

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

  debug(_.size(maleMaleList));
  debug(_.size(femaleFemaleList));

  debug(_.size(maleFemaleList));
  debug(_.size(femaleMaleList));

  debug(_.size(maleUnknownList));
  debug(_.size(femaleUnknownList));

  // 首先匹配 男->男 女->女 列表，其中剩余的用户无法继续处理
  const maleMaleCandidateList = splitIntoAcvitiyRoomCandidate(maleMaleList),
      femaleFemaleCandidateList = splitIntoAcvitiyRoomCandidate(femaleFemaleList);

  const maleFemaleListSize = _.size(maleFemaleList),  // 男->女 大小
      femaleMaleListSize = _.size(femaleMaleList);    // 女->男 大小

  const mixedSize = _.min([maleFemaleListSize, femaleMaleListSize]);                        // 两者中的小值 -> 能匹配到的组数

  const promisedMaleFemaleList = _.take(maleFemaleList, mixedSize),                         // 男->女 中必定能匹配到的用户
      promisedFemalMaleList = _.take(femaleMaleList, mixedSize),                            // 女->男 中必定能匹配到的用户
      remainMaleFemaleList = _.takeRight(maleFemaleList, maleFemaleListSize - mixedSize),   // 男->女 中剩余的用户
      remainFemaleMaleList = _.takeRight(femaleMaleList, femaleMaleListSize - mixedSize);   // 女->男 中剩余的用户

  // 将 男->女 与 女->男 互相匹配
  const mixedCandidateList = _.zip(promisedFemalMaleList, promisedMaleFemaleList);

  const maleUnknownListSize = _.size(maleUnknownList),    // 男->未知  大小
      femaleUnknownListSize = _.size(femaleUnknownList);  // 女->未知  大小

  const mixedMaleUnknownSize = _.min([_.size(remainMaleFemaleList), femaleUnknownListSize]),  // 能匹配到 男->女 女->未知 组数
      mixedFemaleUnknownSize = _.min([_.size(remainFemaleMaleList), maleUnknownListSize]);    // 能匹配到 女->男 男->未知 组数

  const promisedMaleFemaleUnknownList = _.take(remainMaleFemaleList, mixedMaleUnknownSize), // 剩余的 男->女 中必定能匹配到的用户
      promiseFemaleUnknownMaleList = _.take(femaleUnknownList, mixedMaleUnknownSize),       // 女->未知 中要匹配的用户数
      promisedFemaleMaleUnknownList = _.take(remainFemaleMaleList, mixedFemaleUnknownSize), // 剩余的 女->男 中必定能匹配到的用户
      promisedMaleUnknownFemaleList = _.take(maleUnknownList, mixedFemaleUnknownSize),      // 男->未知  中要匹配的用户数

      remainFemaleUnknownList = _.takeRight(femaleUnknownList, femaleUnknownListSize - mixedMaleUnknownSize), // 女->未知 中的剩余用户
      remainMaleUnknownList = _.takeRight(maleUnknownList, maleUnknownListSize - mixedFemaleUnknownSize); // 男->未知 中的剩余用户

  // 剩余的 男->未知 与 女->未知 匹配
  const mixedMaleFemaleKnownCandidateList = _.zip(promisedMaleFemaleUnknownList, promiseFemaleUnknownMaleList), // 剩余的 女->男 与 男->未知 匹配
      mixedFemaleMaleUnknownCandidateList = _.zip(promisedFemaleMaleUnknownList, promisedMaleUnknownFemaleList), // 剩余的 女->未知 男->未知 打乱再匹配
      unknownUnknownCandidateList = splitIntoAcvitiyRoomCandidate(_.flatten([remainFemaleUnknownList, remainMaleUnknownList]));

  debug(_.size(remainFemaleUnknownList));
  debug(_.size(remainMaleUnknownList));

  return {
    maleMale: maleMaleCandidateList,
    femaleFemale: femaleFemaleCandidateList,
    mixedMaleFemale: mixedCandidateList,
    mixedMaleFemaleKnown: mixedMaleFemaleKnownCandidateList,
    mixedFemaleMaleUnknown: mixedFemaleMaleUnknownCandidateList,
    unknownUnknown: unknownUnknownCandidateList,
    random: []
  };
};

/**
 * 随机匹配
 *
 * @param activityAccountList
 * @returns {{}}
 */
pub.randomMatchActivityAccount = (activityAccountList) => {
  const listSize = _.size(activityAccountList);

  debug(listSize);

  if (listSize % 2 !== 0) {
    activityAccountList.splice(listSize - 1, 1)
  }

  const randomMatchList = splitIntoAcvitiyRoomCandidate(_.shuffle(activityAccountList));

  debug(_.size(randomMatchList));

  return {
    maleMale: [],
    femaleFemale: [],
    mixedMaleFemale: [],
    mixedMaleFemaleKnown: [],
    mixedFemaleMaleUnknown: [],
    unknownUnknown: [],
    random: randomMatchList
  };
};

module.exports = pub;
