'use strict';
/**
 * 微信模板消息配置和发送接口
 */
const _ = require('lodash');
const moment = require('moment');
const TEMPLATE_ID = global.IS_DEVLOPMENT_ENVIRONMENT
    ? 'wDZalRIn5gf69d5uNukRo6Q8k0Ms71Y_IOZ5L3Ky0bg'
    : "Dk7sk1kvB7xFSVjG4Y80dq8zagpMM_vPUPo8d8xv96M";

const ALERT_COLOR = '#FF4060';

const constructCourseTemplateMessage = (openId, url, title, courseName, username, desc) => {
  return {
    "touser": openId,
    "template_id": TEMPLATE_ID,
    "url": url,
    "data": {
      "first": {
        "value": title,
      },
      "keyword1": {
        "value": courseName,
      },
      "keyword2": {
        "value": username,
      },
      "remark": {
        "value": desc,
      }
    }
  };
};

// 广告帖子
let advertisement = (openId, title, desc, courseName, name, url) => {

  let data = {
    "touser": openId,
    "template_id": TEMPLATE_ID,
    "url": url,
    "data": {
      "first": {
        "value": title,
      },
      "keyword1": {
        "value": courseName,
      },
      "keyword2": {
        "value": name,
      },
      "remark": {
        "value": desc,
      }
    }
  };

  return data;
};

// 早晨提醒
let morningAlert = (openId, name, dayNum, courseName, url) => {

  let title = "第 " + dayNum + " 天的挑战开始了，" + "快快完成任务吧。(任务完成后记得点打卡哦)";
  let desc = "平庸，就是失去追求卓越信念的那个瞬间。今日再接再厉！！快快点击【详情】进入今日任务开启新的征程。";
  let data = {
    "touser": openId,
    "template_id": TEMPLATE_ID,
    "url": url,
    "data": {
      "first": {
        "value": title,
      },
      "keyword1": {
        "value": courseName,
      },
      "keyword2": {
        "value": name,
      },
      "remark": {
        "value": desc,
      }
    }
  };

  return data;
};

// 晚上提醒
let eveningAlert = (openId, name, url, courseName) => {

  let title = "垂死病中惊坐起，今天忘了学英语！时间不多啦，抓紧呐！(发送学习记录过后记得按打卡哦)";
  let desc = "(友情提示：严禁滥竽充数，珍爱学分，人人有责)。";

  let data = {
    "touser": openId,
    "template_id": TEMPLATE_ID,
    "url": url,
    "data": {
      "first": {
        "value": title,
      },
      "keyword1": {
        "value": courseName,
      },
      "keyword2": {
        "value": name,
      },
      "remark": {
        "value": desc,
      }
    }
  };
  return data;
};

// 举起被子班提醒
let wakeupAlert = (openId, name, url, courseName) => {

  let title = "垂死病中惊坐起，举起被子要早起！快起来打卡了！(发送文件后记得去打卡)";
  let desc = "(友情提示：清晨日光伴早起，不要犹豫，快点起来吧！)。";

  let data = {
    "touser": openId,
    "template_id": TEMPLATE_ID,
    "url": url,
    "data": {
      "first": {
        "value": title,
      },
      "keyword1": {
        "value": courseName,
      },
      "keyword2": {
        "value": name,
      },
      "remark": {
        "value": desc,
      }
    }
  };

  return data;
};

// 优惠卷提醒
let couponAlert = (openId, name, money, remark, url) => {

  let courseName = "优惠卷";
  let title = '优惠卷提醒';
  let desc = '恭喜，获得了一张 Uband友班 课程优惠券, 价值 ' + money + '元！备注：' + remark;

  let data = {
    "touser": openId,
    "template_id": TEMPLATE_ID,
    "url": url,
    "data": {
      "first": {
        "value": title,
      },
      "keyword1": {
        "value": courseName,
      },
      "keyword2": {
        "value": name,
      },
      "remark": {
        "value": desc,
      }
    }
  };
  return data;
};

/**
 * 构建活动提醒消息
 *
 * @param openId
 * @param title
 * @param messageType
 * @param author
 * @param desc
 * @returns {{}}
 */
const activityAlert = (openId, title, messageType, author, desc, url) => {
  const alertInfo = {
    touser: openId,
    template_id: 'stPqnDBNkUFaaoQPLTmUh-j2bhG_vEvY0NeWkfzd-sA',
    data: {
      first: {
        value: title,
        color: ALERT_COLOR
      },
      keyword1: {
        value: messageType
      },
      keyword2: {
        value: author
      },
      keyword3: {
        value: moment().format('YYYY年MM月DD日 HH时mm分ss秒')
      },
      remark: {
        value: desc,
        color: ALERT_COLOR
      }
    }
  };

  if (_.isString(url)) {
    alertInfo.url = url;
  }

  return alertInfo;
};

const clazzRankFavourAlert = (openId, username, courseName, favourUsername, url) => {
  const title = `${favourUsername} 赞了你在 ${courseName} 班的排行榜`;
  const desc = '点击查看排行';

  return constructCourseTemplateMessage(openId, url, title, courseName, username, desc);
};

const clazzRankChangeAlert = (openId, courseName, username, rank, url) => {
  const title = `你在 ${courseName} 班级的打卡排行为 ${rank}`;
  const desc = '点击查看排行';

  return constructCourseTemplateMessage(openId, url, title, courseName, username, desc);
};

/**
 * 推广注册提醒消息
 *
 * @param openId
 * @param url
 * @param title
 * @param userName
 * @param desc
 * @returns {{touser: *, template_id: string, url: *, data: {first: {value: *, color: string}, keyword1: {value: *}, keyword2: {value: string}, remark: {value: *, color: string}}}}
 */
const promotionRegisterAlert = (openId, url, title, userName, desc) => {
  const templateId = global.IS_DEVLOPMENT_ENVIRONMENT
      ? 'tEoYxpNJ1npmT6c5nTddNpnP2tWCJ2AaDoYF72NuSkw'
      : 'TXuB6QjoACvoZC0VJqr9qxYgEvIhqaNJsSQY0RdWMto';

  return {
    touser: openId,
    template_id: templateId,
    url: url,
    data: {
      first: {
        value: title,
        color: ALERT_COLOR
      },
      keyword1: {
        value: userName
      },
      keyword2: {
        value: moment().format('YYYY年MM月DD日 HH时mm分ss秒')
      },
      remark: {
        value: desc,
        color: ALERT_COLOR
      }
    }
  };
};

/**
 * 推广收益提醒
 *
 * @param openId
 * @param url
 * @param title
 * @param courseName
 * @param inviteeUserName
 * @param desc
 * @returns {{touser: *, template_id: string, url: *, data: {first: {value: string}, keyword1: {value: *}, keyword2: {value: *}, remark: {value: string}}}}
 */
const promotionIncomeAlert = (openId, url, title, courseName, inviteeUserName, desc) => {
  return {
    "touser": openId,
    "template_id": TEMPLATE_ID,
    "url": url,
    "data": {
      "first": {
        "value": title,
      },
      "keyword1": {
        "value": courseName,
      },
      "keyword2": {
        "value": inviteeUserName,
      },
      "remark": {
        "value": desc,
      }
    }
  };
};

exports.MORNING_ALERT = morningAlert;
exports.EVENING_ALERT = eveningAlert;
exports.COUPON_ALERT = couponAlert;
exports.WAKEUP_ALERT = wakeupAlert;
exports.ADVERTISEMENT = advertisement;
exports.ACTIVITY_ALERT = activityAlert;
exports.CLAZZ_RANK_FAVOUR_ALERT = clazzRankFavourAlert;
exports.CLAZZ_RANK_CHANGE_ALERT = clazzRankChangeAlert;
exports.PROMOTION_REGISTER_ALERT = promotionRegisterAlert;
exports.PROMOTION_INCOME_ALERT = promotionIncomeAlert;
