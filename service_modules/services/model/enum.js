'use strict';
/**
 * Created by globit on 5/28/16.
 * Last Updated At 5/23/19
 * & This file has been updated many times
 *
 */
const _ = require('lodash');

let isNonNegativeInteger = (value) => {
  return _.isSafeInteger(value) && value > 0;
};

let shareTypeEnum = {
  'SHARE':{
    key:'SHARE',
    name: '仅分享'
  },
  'SHAREANDCHECKIN':{
    key:'SHAREANDCHECKIN',
    name:'分享和打卡'
  },
  'CHECKIN':{
    key:'CHECKIN',
    name:'仅打卡'
  },
  'NOTHING':{
    key:'NOTHING',
    name:'佛系学习'
  }
};

let ubandCardStatusEnum = {
  'AVAILABLE': {
    key: 'AVAILABLE',
    name: '可使用'
  },
  'USED': {
    key: 'USED',
    name: '已使用'
  }
};

let ubandCardTypeEnum = {
  'RECOVER_CARD': {
    key : 'RECOVER_CARD',
    name: '复活卡'
  }
};

let ubandCardScopeEnum = {
  'ALL': {
    key: 'ALL',
    name: '所有课程'
  }
};

let checkinStatusEnum = {
  'NORMAL': {
    name: '正常',
    key: 'NORMAL'
  },
  'ABNORMAL': {
    name: '异常',
    key: 'ABNORMAL'
  }
};

let payStatusEnum = {
  'PAYING': {
    name: '付款中',
    key: 'PAYING'
  },
  'PAY_SUCCESS': {
    name: '付款成功',
    key: 'PAY_SUCCESS'
  },
  'PAY_BACK_SUCCESS': {
    name: '退款成功',
    key: 'PAY_BACK_SUCCESS'
  }
};

let qaStatusEnum = {
  'PENDING': {
    name: '已提交',
    key: 'PENDING'
  },
  'PROCESSING': {
    name: '正在回答',
    key: 'PROCESSING'
  },
  'COMPLETED': {
    name: '已点评',
    key: 'COMPLETED'
  }
};

const clazzTypeEnum = {
  'SEMESTER': {
    name: '学期班',
    key: 'SEMESTER'
  },
  'LTS': {
    name: '非学期班',
    key: 'LTS'
  },
  'LONG_TERM': {
    name: '长期班',
    key: 'LONG_TERM'
  },
  'PROMOTION': {
    name: '推广活动班',
    key: 'PROMOTION'
  }
};

let clazzStatusEnum = {
  'CLOSE': {
    name: '关闭',
    key: 'CLOSE'
  },
  'PROCESSING': {
    name: '进行中',
    key: 'PROCESSING'
  },
  'OPEN': {
    name: '开放报名',
    key: 'OPEN'
  }
};

let clazzJoinStatusEnum = {
  'INVITATION': {
    name: '邀请中',
    key: 'INVITATION'
  },
  'PENDING': {
    name: '待审核',
    key: 'PENDING'
  },
  'PAYING': {
    name: '待支付️',
    key: 'PAYING'
  },
  'WAITENTER': {
    name: '待确认',
    key: 'WAITENTER'
  },
  'PROCESSING': {
    name: '进行中',
    key: 'PROCESSING'
  },
  'CANCELED': {
    name: '已取消',
    key: 'CANCELED'
  },
  'CLOSE': {
    name: '关闭',
    key: 'CLOSE'
  }
};

let genderEnum = {
  '0': {
    name: '未知',
    key: '0'
  },
  '1': {
    name: '男',
    key: '1'
  },
  '2': {
    name: '女',
    key: '2'
  }
};

let aimEnum = {
  '0': {
    name: '已找到伙伴',
    key: '0'
  },
  '1': {
    name: '我很忙,不要打扰我',
    key: '1'
  },
  '2': {
    name: '想找人结伴学习',
    key: '2'
  }
};

let mediaTypeEnum = {
  'IMAGE': {
    name: '图片',
    key: 'IMAGE'
  },
  'VOICE': {
    name: '语音',
    key: 'VOICE'
  },
  'VIDEO': {
    name: '视频',
    key: 'VIDEO'
  }
};

let fileTypeEnum = {
  'voice': {
    key: 'voice',
    name: '语音'
  },
  'shortvideo': {
    key: 'shortvideo',
    name: '短视频'
  },
  'image': {
    key: 'image',
    name: '图片'
  },
  'video': {
    key: 'video',
    name: '视频'
  },
  'weblink': {
    key: 'weblink',
    name: '外部链接'
  },
  'attach': {
    key: 'attach',
    name: '附件'
  }
};

let feedbackTypeEnum = {
  'AWESOME_ME': {
    key: 'AWESOME_ME',
    name: '给我点赞'
  },
  'CHECKIN_CONTENT': {
    key: 'CHECKIN_CONTENT',
    name: '打卡内容'
  },
  'DRAWBACK_ISSUE': {
    key: 'DRAWBACK_ISSUE',
    name: '退款问题'
  },
  'CLAZZ_CONTENT': {
    key: 'CLAZZ_CONTENT',
    name: '课程内容'
  },
  'PRODUCT_FEEDBACK': {
    key: 'PRODUCT_FEEDBACK',
    name: '产品意见'
  }
};

let feedbackStatusEnum = {
  'WAITING': {
    key: 'WAITING',
    name: '待处理'
  },
  'DISPOSED': {
    key: 'DISPOSED',
    name: '已处理'
  },
  'CLOSED': {
    key: 'CLOSED',
    name: '已关闭'
  }
};

let userQuestionStatusEnum = {
  'WAITING': {
    key: 'WAITING',
    name: '待回答'
  },
  'ANSWERED': {
    key: 'ANSWERED',
    name: '已回答'
  },
  'CLOSED': {
    key: 'CLOSED',
    name: '已关闭'
  }
};

/**
 * 用户申请提现状态
 * 1. 用于用户申请退班
 *
 * @type {{}}
 */
let withdrawStatusEnum = {
  'WAITING': {
    key: 'WAITING',
    name: '待处理'
  },
  'AGREED': {
    key: 'AGREED',
    name: '已同意'
  },
  'REJECTED': {
    key: 'REJECTED',
    name: '已拒绝'
  }
};

let payWayEnum = {
  'alipay': {
    key: 'alipay',
    name: '支付宝'
  },
  'wechat': {
    key: 'wechat',
    name: '微信'
  },
  'wechat_uband_app': {
    key: 'wechat_uband_app',
    name: '友班APP微信支付'
  },
  'alipay_uband_app': {
    key: 'alipay_uband_app',
    name: '友班APP支付宝支付'
  },
};

let coinBizTypeEnum = {
  'WITHDRAW': {
    key: 'WITHDRAW',
    name: '提现操作'
  },
  'QUITCLAZZ': {
    key: 'QUITCLAZZ',
    name: '学员退班'
  },
  'CLAZZEND': {
    key: 'CLAZZEND',
    name: '课程结课'
  },
  'CLAZZSTART': {
    key: 'CLAZZSTART',
    name: '课程报名'
  },
  'SCOREADD': {
    key: 'SCOREADD',
    name: '补充学分'
  },
  'COINAWARD': {
    key: 'COINAWARD',
    name: '积分奖励'
  },
  'COINPUNISHMENT': {
    key: 'COINPUNISHMENT',
    name: '积分惩罚'
  },
  'OTHER': {
    key: 'OTHER',
    name: '其他操作'
  },
  'PROMOTION': {
    key: 'PROMOTION',
    name: '推广收益'
  }
};

let clazzHelpTopEnum = {
  'TOP': {
    key: true,
    name: '置顶'
  },
  'UNTOP': {
    key: false,
    name: '未置顶'
  }
};

let materialTypeEnum = {
  'AUDIO': {
    key: 'AUDIO',
    name: '音频'
  },
  'IMAGE': {
    key: 'IMAGE',
    name: '图片'
  },
  'VIDEO': {
    key: 'VIDEO',
    name: '视频'
  },
  'FILE': {
    key: 'FILE',
    name: '文件'
  }
};

let qiniuFileTypeEnum = {
  'PUBLIC': {
    key: 'PUBLIC',
    name: '公开文件'
  },
  'SECRET': {
    key: 'SECRET',
    name: '私密文件'
  },
  'CHECKIN_REPOSITORY': {
    key: 'CHECKIN_REPOSITORY',
    name: '用户打卡文件'
  }
};

let clazzTaskIntroductionTypeEnum = {
  'TEACHER_QA': {
    key: 'TEACHER_QA',
    name: '笃师问答'
  },
  'TEACHER_NAG': {
    key: 'TEACHER_NAG',
    name: '笃师碎碎念'
  },
  'TASK_DESCRIPTION': {
    key: 'TASK_DESCRIPTION',
    name: '任务描述'
  },
  'SPECIAL_NOTIFICATION': {
    key: 'SPECIAL_NOTIFICATION',
    name: '特别通知'
  },
  'USER_SHARE':{
    key: 'USER_SHARE',
    name: '分享任务'
  },
  'ENGLISH_TEXT':{
    key: 'ENGLISH_TEXT',
    name: '英文文本'
  },
  'OTHER': {
    key: 'OTHER',
    name: '其他'
  }
};

let operationTypeEnum = {
  // 班级
  'VERIFY_CHEKCIN': {
    key: 'VERIFY_CHEKCIN',
    name: '审核打卡 {0}, 置其状态为 {1}, 分数为 {2}'
  },
  'PENALIZE_CHECKIN': {
    key: 'PENALIZE_CHECKIN',
    name: '监督打卡 {0}, 类型 {1}, 扣除分数{2}, 提示信息为 {3}'
  },
  'DELETE_CHEKCIN': {
    key: 'DELETE_CHEKCIN',
    name: '删除打卡 {0}'
  },
  'DRAW_CHECKIN': {
    key: 'DRAW_CHECKIN',
    name: '抽取班级 {0} 的 {1} 个打卡到幸运列表'
  },
  'ADD_OUTSTANDING': {
    key: 'ADD_OUTSTANDING',
    name: '添加打卡文件 {0} 到班级 {1} 的精选'
  },
  'REMOVE_OUTSTANDING': {
    key: 'REMOVE_OUTSTANDING',
    name: '移除精选 {0}'
  },
  'COMMENT_OUTSTANDING': {
    key: 'COMMENT_OUTSTANDING',
    name: '为精选 {0} 添加了评语 {1}'
  },
  'VERIFY_USER': {
    key: 'VERIFY_USER',
    name: '审核班级 {0} 的账户 {1} 为 {2} 状态'
  },
  'CHANGE_USER_CLASS': {
    key: 'CHANGE_USER_CLASS',
    name: '将班级 {0} 的账户 {1} 移到班级 {2}'
  },
  'ADD_USER_CHECKIN': {
    key: 'ADD_USER_CHECKIN',
    name: '帮班级 {0} 用户 {1} 打卡, 目标日期为 {2}'
  },
  'GROUP_CLAZZ_USER': {
    key: 'GROUP_CLAZZ_USER',
    name: '将班级 {0} 的未分组用户分成大小为 {1} 的组'
  },
  'SAVE_CLAZZ_CAPTAIN': {
    key: 'SAVE_CLAZZ_CAPTAIN',
    name: '保存班级 {0} 组长列表 {1}'
  },
  'UPDATE_CLAZZ_GROUP': {
    key: 'UPDATE_CLAZZ_GROUP',
    name: '更新班级 {0} 分组 {1} 名称为 {2}, 组员为 {3}'
  },
  'ANSWER_USER_QUESTION': {
    key: 'ANSWER_USER_QUESTION',
    name: '回答班级 {0} 用户问题 {1}, 答案为 {2}'
  },
  'CLOSE_USER_QUESTION': {
    key: 'CLOSE_USER_QUESTION',
    name: '关闭了班级 {0} 用户问题 {1}'
  },
  'CREATE_CLAZZ_MATERIAL': {
    key: 'CREATE_CLAZZ_MATERIAL',
    name: '创建了 班级 {0} 的 {1} 类型的素材, 标题为 {2}, 关联附件{3}'
  },
  'UPDATE_CLAZZ_MATERIAL': {
    key: 'UPDATE_CLAZZ_MATERIAL',
    name: '更新了班级 {0} 的素材 {1}, 标题为 {2}, 备注为 {3}'
  },
  'DELETE_CLAZZ_MATERIAL': {
    key: 'DELETE_CLAZZ_MATERIAL',
    name: '移除了班级 {0} 的素材 {1}'
  },
  'CREATE_CLAZZ_POST': {
    key: 'CREATE_CLAZZ_POST',
    name: '创建了班级 {0} 文章, 标题为 {1},  类型 {2}, 目标天数为 {3}, 目标日期为 {4}, 链接 {5}'
  },
  'UPDATE_CLAZZ_POST': {
    key: 'UPDATE_CLAZZ_POST',
    name: '更新了班级 {0} 文章 {1}, 目标日期为 {2}'
  },
  'DELETE_CLAZZ_POST': {
    key: 'DELETE_CLAZZ_POST',
    name: '移除了班级 {0} 文章 {1}'
  },
  // 任务管理
  'CREATE_CLAZZ_TASK': {
    key: 'CREATE_CLAZZ_TASK',
    name: '创建了班级 {0} 的任务, 标题为 {1}, 目标天数为 {2}, 目标日期为 {3}, 素材为 {4}'
  },
  'UPDATE_CLAZZ_TASK': {
    key: 'UPDATE_CLAZZ_TASK',
    name: '更新了班级 {0} 的任务 {1}, 标题为 {2}, 目标天数为 {3}, 目标日期为 {4}, 素材为 {5}'
  },
  'DELETE_CLAZZ_TASK': {
    key: 'DELETE_CLAZZ_TASK',
    name: '移除班级 {0} 的任务 {1}'
  },
  // 系统
  'ADD_COUPON': {
    key: 'ADD_COUPON',
    name: '为用户 {0} 增加了价值为 {1} 的优惠卷, 有效日期至 {2}'
  },
  'UPDATE_COUPON': {
    key: 'UPDATE_COUPON',
    name: '更新了优惠卷 {0}, 价值为 {1}, 有效日期至 {2}'
  },
  'DELETE_COUPON': {
    key: 'DELETE_COUPON',
    name: '删除了优惠卷 {0}'
  },
  'UPDATE_FEEDBACK': {
    key: 'UPDATE_FEEDBACK',
    name: '更新了反馈 {0}, 状态为 {1}'
  },
  'CLOSE_FEEDBACK': {
    key: 'CLOSE_FEEDBACK',
    name: '关闭了反馈 {0}'
  },
  'CREATE_AUTO_REPLY': {
    key: 'CREATE_AUTO_REPLY',
    name: '创建了标题为 {0} 的自动回复, 类型 {1}, 内容 {2}'
  },
  'UPDATE_AUTO_REPLY': {
    key: 'UPDATE_AUTO_REPLY',
    name: '更新了自动回复 {0}, 标题为 {1}, 类型 {2}, 内容 {3}'
  },
  'DELETE_AUTO_REPLY': {
    key: 'DELETE_AUTO_REPLY',
    name: '移除了自动回复 {0}'
  },
  'CREATE_USER_COIN': {
    key: 'CREATE_USER_COIN',
    name: '给用户 {0} 新增了 {1} 优币, 标题为 {2}, 类型 {3}, 备注 {4}'
  },
  'UPDATE_WITHDRAW': {
    key: 'UPDATE_WITHDRAW',
    name: '更新了退款申请 {0}, 状态为 {1}, 核准退款 {2}, 备注 {3}'
  },
  'PUSH_WECHAT_MESSAGE': {
    key: 'PUSH_WECHAT_MESSAGE',
    name: '推送消息模板 {0} 到班级 {1} 中状态为 {2} 且名字中包含 {3} 的学员; 消息类型为 {4}, 参数 {5}'
  },
  'CREATE_ADMIN': {
    key: 'CREATE_ADMIN',
    name: '创建 {0} 类型管理员 {1}, 昵称 {2}'
  },
  'DELETE_ADMIN': {
    key: 'DELETE_ADMIN',
    name: '删除管理员 {0}'
  },
  'UPDATE_ADMIN_PERMISSION': {
    key: 'UPDATE_ADMIN_PERMISSION',
    name: '更新管理员 {0} 的 {1} 权限, 参数为 {2}'
  },
  'CREATE_BUSINESS_CARD': {
    key: 'CREATE_BUSINESS_CARD',
    name: '创建 {0} 类型名片, 名称为 {1}'
  },
  'UPDATE_BUSINESS_CARD': {
    key: 'UPDATE_BUSINESS_CARD',
    name: '更新名片 {0}'
  },
  'DELETE_BUSINESS_CARD': {
    key: 'DELETE_BUSINESS_CARD',
    name: '删除名片 {0}'
  },
  'CREATE_ACTIVITY': {
    key: 'CREATE_ACTIVITY',
    name: '创建活动, 标题 {0}, 日期 {1}, 开始时间 {2}, 结束时间 {3}, 描述 {4}'
  },
  'UPDATE_ACTIVITY': {
    key: 'UPDATE_ACTIVITY',
    name: '更新活动 {0}'
  },
  'DELETE_ACTIVITY': {
    key: 'DELETE_ACTIVITY',
    name: '删除活动 {0}'
  },
  // 任务留言管理
  'FEEDBACK_CLAZZ_TASK_REPLY': {
    key: 'FEEDBACK_CLAZZ_TASK_REPLY',
    name: '回复班级任务留言 {0}, 内容为 {1}'
  },
  'SELECT_CLAZZ_TASK_REPLY': {
    key: 'SELECT_CLAZZ_TASK_REPLY',
    name: '精选班级任务留言 {0}'
  },
  'DESELECT_CLAZZ_TASK_REPLY': {
    key: 'DESELECT_CLAZZ_TASK_REPLY',
    name: '移除班级任务留言精选 {0}'
  },
  'DELETE_CLAZZ_TASK_REPLY': {
    key: 'DELETE_CLAZZ_TASK_REPLY',
    name: '移除班级任务 {0}'
  },
  // 游戏素材管理
  'CREATE_GAME_MATERIAL': {
    key: 'CREATE_GAME_MATERIAL',
    name: '创建游戏素材，素材短语{0}，素材语音个数{1}'
  },
  'UPDATE_GAME_MATERIAL': {
    key: 'UPDATE_GAME_MATERIAL',
    name: '更新游戏素材{0}，素材短语{1}，素材语音个数{2}'
  },
  'DELETE_GAME_MATERIAL': {
    key: 'DELETE_GAME_MATERIAL',
    name: '删除游戏素材{0}'
  },
  // theOne反馈素材管理
  'CREATE_CLAZZ_FEEDBACK_MATERIAL': {
    key: 'CREATE_CLAZZ_FEEDBACK_MATERIAL',
    name: '创建了班级 {0} 的theOne反馈素材, 标题为 {1}'
  },
  'UPDATE_CLAZZ_FEEDBACK_MATERIAL': {
    key: 'UPDATE_CLAZZ_FEEDBACK_MATERIAL',
    name: '更新了班级 {0} 的theOne反馈素材 {1}, 标题为 {2}'
  },
  'DELETE_CLAZZ_FEEDBACK_MATERIAL': {
    key: 'DELETE_CLAZZ_FEEDBACK_MATERIAL',
    name: '移除班级 {0} 的theOne反馈素材 {1}'
  },
};

let permissionTypeEnum = {
  'CLAZZ_PERMISSION': {
    key: 'CLAZZ_PERMISSION',
    name: '班级权限'
  },
  'SYSTEM_PERMISSION': {
    key: 'SYSTEM_PERMISSION',
    name: '系统权限'
  }
};

let permissionEnum = {
  'CLAZZ_PERMISSION': {
    // 查询
    'CLAZZ_QUERY': {
      key: 'CLAZZ_QUERY',
      name: '查询班级信息'
    },
    // 人员管理
    'VERIFY_USER': {
      key: 'VERIFY_USER',
      name: '审核班级账户'
    },
    'CHANGE_USER_CLASS': {
      key: 'CHANGE_USER_CLASS',
      name: '移动班级账户'
    },
    'ADD_USER_CHECKIN': {
      key: 'ADD_USER_CHECKIN',
      name: '新建班级用户打卡'
    },
    // 班级分组
    'GROUP_USER': {
      key: 'GROUP_USER',
      name: '分组班级用户'
    },
    'UPDATE_CLAZZ_GROUP': {
      key: 'UPDATE_CLAZZ_GROUP',
      name: '更新班级分组'
    },
    // 文章管理
    'CREATE_CLAZZ_POST': {
      key: 'CREATE_CLAZZ_POST',
      name: '创建班级文章'
    },
    'UPDATE_CLAZZ_POST': {
      key: 'UPDATE_CLAZZ_POST',
      name: '更新班级文章'
    },
    'DELETE_CLAZZ_POST': {
      key: 'DELETE_CLAZZ_POST',
      name: '移除班级文章'
    },
    // 打卡管理
    'VERIFY_CHEKCIN': {
      key: 'VERIFY_CHEKCIN',
      name: '审核打卡'
    },
    'DELETE_CHEKCIN': {
      key: 'DELETE_CHEKCIN',
      name: '删除打卡'
    },
    'PENALIZE_CHECKIN': {
      key: 'PENALIZE_CHECKIN',
      name: '监督打卡'
    },
    'DRAW_CHECKIN': {
      key: 'DRAW_CHECKIN',
      name: '抽取打卡'
    },
    // 精选管理
    'ADD_OUTSTANDING': {
      key: 'ADD_OUTSTANDING',
      name: '添加精选'
    },
    'REMOVE_OUTSTANDING': {
      key: 'REMOVE_OUTSTANDING',
      name: '移除精选'
    },
    'COMMENT_OUTSTANDING': {
      key: 'COMMENT_OUTSTANDING',
      name: '评论精选'
    },
    // 问题管理
    'ANSWER_USER_QUESTION': {
      key: 'ANSWER_USER_QUESTION',
      name: '回答班级用户问题'
    },
    'CLOSE_USER_QUESTION': {
      key: 'CLOSE_USER_QUESTION',
      name: '关闭班级用户问题'
    },
    // 任务管理
    'CREATE_CLAZZ_TASK': {
      key: 'CREATE_CLAZZ_TASK',
      name: '创建班级任务'
    },
    'UPDATE_CLAZZ_TASK': {
      key: 'UPDATE_CLAZZ_TASK',
      name: '更新班级任务'
    },
    'DELETE_CLAZZ_TASK': {
      key: 'DELETE_CLAZZ_TASK',
      name: '移除班级任务'
    },
    // 素材管理
    'CREATE_CLAZZ_MATERIAL': {
      key: 'CREATE_CLAZZ_MATERIAL',
      name: '创建班级素材'
    },
    'UPDATE_CLAZZ_MATERIAL': {
      key: 'UPDATE_CLAZZ_MATERIAL',
      name: '更新班级素材'
    },
    'DELETE_CLAZZ_MATERIAL': {
      key: 'DELETE_CLAZZ_MATERIAL',
      name: '移除班级素材'
    },
    // 任务留言管理
    'FEEDBACK_CLAZZ_TASK_REPLY': {
      key: 'FEEDBACK_CLAZZ_TASK_REPLY',
      name: '回复班级任务留言'
    },
    'SELECT_CLAZZ_TASK_REPLY': {
      key: 'SELECT_CLAZZ_TASK_REPLY',
      name: '精选班级任务留言'
    },
    'DESELECT_CLAZZ_TASK_REPLY': {
      key: 'DESELECT_CLAZZ_TASK_REPLY',
      name: '移除班级任务留言精选'
    },
    'DELETE_CLAZZ_TASK_REPLY': {
      key: 'DELETE_CLAZZ_TASK_REPLY',
      name: '移除班级任务留言'
    },
    'CREATE_CLAZZ_FEEDBACK_MATERIAL': {
      key: 'CREATE_CLAZZ_FEEDBACK_MATERIAL',
      name: '创建班级theOne反馈素材'
    },
    'UPDATE_CLAZZ_FEEDBACK_MATERIAL': {
      key: 'UPDATE_CLAZZ_FEEDBACK_MATERIAL',
      name: '更新班级theOne反馈素材'
    },
    'DELETE_CLAZZ_FEEDBACK_MATERIAL': {
      key: 'DELETE_CLAZZ_FEEDBACK_MATERIAL',
      name: '移除班级theOne反馈素材'
    },
  },
  'SYSTEM_PERMISSION': {
    // 查询
    'CLAZZ_QUERY': {
      key: 'CLAZZ_QUERY',
      name: '查询班级信息'
    },
    'SYSTEM_QUERY': {
      key: 'SYSTEM_QUERY',
      name: '查询系统信息'
    },
    // 上传文件
    'UPLOAD_QINIU_FILE': {
      key: 'UPLOAD_QINIU_FILE',
      name: '上传七牛云文件'
    },
    // 自动回复
    'VIEW_AUTO_REPLY': {
      key: 'VIEW_AUTO_REPLY',
      name: '查看自动回复'
    },
    'CREATE_AUTO_REPLY': {
      key: 'CREATE_AUTO_REPLY',
      name: '创建自动回复'
    },
    'UPDATE_AUTO_REPLY': {
      key: 'UPDATE_AUTO_REPLY',
      name: '更新自动回复'
    },
    'DELETE_AUTO_REPLY': {
      key: 'DELETE_AUTO_REPLY',
      name: '移除自动回复'
    },
    // 消息推送
    'VIEW_WECHAT_MESSAGE': {
      key: 'VIEW_WECHAT_MESSAGE',
      name: '查看模板消息'
    },
    'PUSH_WECHAT_MESSAGE': {
      key: 'PUSH_WECHAT_MESSAGE',
      name: '推送模板消息'
    },
    // 学员管理
    'VIEW_USER': {
      key: 'VIEW_USER',
      name: '查看学员'
    },
    'ADD_COUPON': {
      key: 'ADD_COUPON',
      name: '增加优惠卷'
    },
    'CREATE_USER_COIN': {
      key: 'CREATE_USER_COIN',
      name: '新增了用户优币'
    },
    // 优惠卷管理
    'VIEW_COUPON': {
      key: 'VIEW_COUPON',
      name: '查看优惠卷'
    },
    'UPDATE_COUPON': {
      key: 'UPDATE_COUPON',
      name: '更新优惠卷'
    },
    'DELETE_COUPON': {
      key: 'DELETE_COUPON',
      name: '删除优惠卷'
    },
    // 退款管理
    'VIEW_WITHDRAW': {
      key: 'VIEW_WITHDRAW',
      name: '查看退款申请'
    },
    'UPDATE_WITHDRAW': {
      key: 'UPDATE_WITHDRAW',
      name: '更新退款申请'
    },
    // 用户反馈
    'VIEW_FEEDBACK': {
      key: 'VIEW_FEEDBACK',
      name: '查看反馈'
    },
    'UPDATE_FEEDBACK': {
      key: 'UPDATE_FEEDBACK',
      name: '更新反馈'
    },
    'CLOSE_FEEDBACK': {
      key: 'CLOSE_FEEDBACK',
      name: '关闭反馈'
    },
    // 管理员权限管理
    'VIEW_ADMIN': {
      key: 'VIEW_ADMIN',
      name: '查看管理员'
    },
    'CREATE_ADMIN': {
      key: 'CREATE_ADMIN',
      name: '创建管理员'
    },
    'DELETE_ADMIN': {
      key: 'DELETE_ADMIN',
      name: '删除管理员'
    },
    'UPDATE_ADMIN_PERMISSION': {
      key: 'UPDATE_ADMIN_PERMISSION',
      name: '更新管理员权限'
    },
    // 系统帮助
    'VIEW_HELP': {
      key: 'VIEW_HELP',
      name: '查看帮助'
    },
    'CREATE_HELP': {
      key: 'CREATE_HELP',
      name: '创建帮助'
    },
    'UPDATE_HELP': {
      key: 'UPDATE_HELP',
      name: '更新帮助'
    },
    'DELETE_HELP': {
      key: 'DELETE_HELP',
      name: '删除帮助'
    },
    // 班级管理
    'VIEW_CLAZZ': {
      key: 'VIEW_CLAZZ',
      name: '查看班级'
    },
    'CREATE_CLAZZ': {
      key: 'CREATE_CLAZZ',
      name: '创建班级'
    },
    'UPDATE_CLAZZ': {
      key: 'UPDATE_CLAZZ',
      name: '更新班级'
    },
    'DELETE_CLAZZ': {
      key: 'DELETE_CLAZZ',
      name: '删除班级'
    },
    // 名片管理
    'VIEW_BUSINESS_CARD': {
      key: 'VIEW_BUSINESS_CARD',
      name: '查看名片'
    },
    'CREATE_BUSINESS_CARD': {
      key: 'CREATE_BUSINESS_CARD',
      name: '创建名片'
    },
    'UPDATE_BUSINESS_CARD': {
      key: 'UPDATE_BUSINESS_CARD',
      name: '更新名片'
    },
    'DELETE_BUSINESS_CARD': {
      key: 'DELETE_BUSINESS_CARD',
      name: '删除名片'
    },
    //活动管理
    'LIST_ACTIVITIES': {
      key: 'LIST_ACTIVITIES',
      name: '展示活动'
    },
    'CREATE_ACTIVITY': {
      key: 'CREATE_ACTIVITY',
      name: '创建活动'
    },
    'UPDATE_ACTIVITY': {
      key: 'UPDATE_ACTIVITY',
      name: '更新活动'
    },
    'DELETE_ACTIVITY': {
      key: 'DELETE_ACTIVITY',
      name: '删除活动'
    },
    //素材管理
    'LIST_MATERIAL': {
      key: 'LIST_MATERIAL',
      name: '展示素材'
    },
    'CREATE_MATERIAL': {
      key: 'CREATE_MATERIAL',
      name: '创建素材'
    },
    'UPDATE_MATERIAL': {
      key: 'UPDATE_MATERIAL',
      name: '更新素材'
    },
    'DELETE_MATERIAL': {
      key: 'DELETE_MATERIAL',
      name: '删除素材'
    },
    //游戏统计数据
    'VIEW_GAME_DATA': {
      key: 'VIEW_GAME_DATA',
      name: '展示数据'
    }
  }
};

let systemerTypeEnum = {
  'ADMIN': {
    key: 'ADMIN',
    name: '系统管理员',
    role: { 'roles': ['admin'] },
    permission: {
      'CLAZZ_PERMISSION': {},
      'SYSTEM_PERMISSION': ['CLAZZ_QUERY', 'SYSTEM_QUERY', 'UPLOAD_QINIU_FILE', 'VIEW_AUTO_REPLY', 'CREATE_AUTO_REPLY', 'UPDATE_AUTO_REPLY', 'DELETE_AUTO_REPLY', 'VIEW_WECHAT_MESSAGE', 'PUSH_WECHAT_MESSAGE', 'VIEW_USER', 'ADD_COUPON', 'CREATE_USER_COIN', 'VIEW_COUPON', 'UPDATE_COUPON', 'DELETE_COUPON', 'VIEW_WITHDRAW', 'UPDATE_WITHDRAW', 'VIEW_FEEDBACK', 'UPDATE_FEEDBACK', 'CLOSE_FEEDBACK', 'VIEW_ADMIN', 'UPDATE_ADMIN_PERMISSION']
    }
  },
  'TEACHER': {
    key: 'TEACHER',
    name: '笃师',
    role: { 'roles': ['teacher'] },
    permission: {
      'CLAZZ_PERMISSION': {},
      'SYSTEM_PERMISSION': ['CLAZZ_QUERY', 'UPLOAD_QINIU_FILE']
    }
  },
  'ROBOT': {
    key: 'ROBOT',
    name: '机器人',
    role: { 'roles': ['robot'] },
    permission: {
      'CLAZZ_PERMISSION': {},
      'SYSTEM_PERMISSION': ['CLAZZ_QUERY', 'UPLOAD_QINIU_FILE']
    }
  }
};

let clazzJoinTypeEnum = {
  'PAY': {
    key: 'PAY',
    name: '付费班'
  },
  'INVITATION': {
    key: 'INVITATION',
    name: '邀请好友'
  },
  'FREE': {
    key: 'FREE',
    name: '免费班'
  },
  'GAMBITION_COIN': {
    key: 'GAMBITION_COIN',
    name: '笃金班'
  },
  'GROUP_PURCHASE': {
    key: 'GROUP_PURCHASE',
    name: '拼团班'
  },
};


let templateMsgTypeEnum = {
  'TEMPLATE_MSG': {
    key: 'TEMPLATE_MSG',
    name: '模板消息'
  },
  'CUSTOMIZED_MSG': {
    key: 'CUSTOMIZED_MSG',
    name: '定制消息'
  }
};

let customizedMsgTypeEnum = {
  'TEXT': {
    key: 'TEXT',
    name: '文本消息'
  },
  'IMAGE': {
    key: 'IMAGE',
    name: '图片消息'
  },
  'VOICE': {
    key: 'VOICE',
    name: '语音消息'
  },
  'VIDEO': {
    key: 'VIDEO',
    name: '视频消息'
  },
  'MUSIC': {
    key: 'MUSIC',
    name: '音乐消息'
  },
  'NEWS': {
    key: 'NEWS',
    name: '图文消息'
  }
};

let couponStatusEnum = {
  'AVAILABLE': {
    key: 'AVAILABLE',
    name: '可使用'
  },
  'USED': {
    key: 'USED',
    name: '已使用'
  }
};

let checkinPenaltyTypeEnum = {
  'RED_CARD': {
    key: 'RED_CARD',
    name: '红牌',
    generatePenalty: function (penalty, info) {
      let realPenalty = isNonNegativeInteger(penalty) ? penalty : 2;
      return {
        type: 'RED_CARD',
        date: new Date(),
        penalty: realPenalty,
        info: info || '你获得了一张红牌，扣除了 ' + realPenalty + ' 学分，请注意完成作业的质量'
      };
    }
  },
  'YELLOW_CARD': {
    key: 'YELLOW_CARD',
    name: '黄牌',
    generatePenalty: function (penalty, info) {
      let realPenalty = isNonNegativeInteger(penalty) ? penalty : 1;
      return {
        type: 'YELLOW_CARD',
        date: new Date(),
        penalty: realPenalty,
        info: info || '你获得了一张黄牌，请注意完成作业质量'
      };
    }
  }
};

let businessCardTypeEnum = {
  'TEACHER': {
    key: 'TEACHER',
    name: '学堂笃师'
  },
  'OFFICIAL_ACCOUNT': {
    key: 'OFFICIAL_ACCOUNT',
    name: '学堂公众号'
  }
};

let shareToTypeEnum = {
  'APP_MESSAGE': {
    key: 'APP_MESSAGE',
    name: '朋友'
  },
  'TIME_LINE': {
    key: 'TIME_LINE',
    name: '朋友圈'
  }
};

let soundGameUserInterfaceEnum = {
  'SOUND_GAME_INDEX': {
    key: 'SOUND_GAME_INDEX',
    name: '语音小游戏首页'
  },
  'SHARE_GAME': {
    key: 'SHARE_GAME',
    name: '好友分享页面'
  },
  'SHARE_ME': {
    key: 'SHARE_ME',
    name: '游戏分享页面'
  },
  'SHARE_RESULT': {
    key: 'SHARE_RESULT',
    name: '好友竞猜完分享页面'
  }
};

let clazzLevelEnum = {
  basic: {
    key: 'basic',
    name: '基础'
  },
  pre_intermediate: {
    key: 'pre_intermediate',
    name: '进阶'
  },
  advance: {
    key: 'advance',
    name: '高级'
  },
  translation: {
    key: 'translation',
    name: '翻译'
  },
};

let clazzFeedbackReplyTypeEnum = {
  'VOICE': {
    key: 'VOICE',
    name: '语音文件'
  },
  'MATERIAL': {
    key: 'MATERIAL',
    name: '反馈素材',
  },
  'TEXT': {
    key: 'TEXT',
    name: '文字消息'
  }
};

/**
 * 笃师一对一反馈状态
 *
 * @type {{key: {key: string, name: string}}}
 */
let clazzFeedbackStatusEnum = {
  'SUBMITTING': {
    key: 'SUBMITTING',
    name: '待提交'
  },
  'WAITING': {
    key: 'WAITING',
    name: '未回复'
  },
  'REPLIED': {
    key: 'REPLIED',
    name: '已回复'
  },
  'CLOSED': {
    key: 'CLOSED',
    name: '已关闭'
  }
};

/**
 * 时区枚举
 *
 * @type {{key: {key: string, name: string}}}}
 */
let timezoneEnum = {
  'UTC+1': {
    key: 'UTC+1',
    timezone: 1,
    name: '柏林-东一区'
  },
  'UTC+2': {
    key: 'UTC+2',
    timezone: 2,
    name: '雅典-东二区'
  },
  'UTC+3': {
    key: 'UTC+3',
    timezone: 3,
    name: '莫斯科-东三区'
  },
  'UTC+4': {
    key: 'UTC+4',
    timezone: 4,
    name: '阿布扎比-东四区'
  },
  'UTC+5': {
    key: 'UTC+5',
    timezone: 5,
    name: '伊斯兰堡-东五区'
  },
  'UTC+6': {
    key: 'UTC+6',
    timezone: 6,
    name: '达卡-东六区'
  },
  'UTC+7': {
    key: 'UTC+7',
    timezone: 7,
    name: '曼谷-东七区'
  },
  'UTC+8': {
    key: 'UTC+8',
    timezone: 8,
    name: '北京-东八区'
  },
  'UTC+9': {
    key: 'UTC+9',
    timezone: 9,
    name: '东京-东九区'
  },
  'UTC+10': {
    key: 'UTC+10',
    timezone: 10,
    name: '堪培拉-东十区'
  },
  'UTC+11': {
    key: 'UTC+11',
    timezone: 11,
    name: '霍尼亚拉-东十一区'
  },
  'UTC+12': {
    key: 'UTC+12',
    timezone: 12,
    name: '惠灵顿-东十二区'
  },
  'UTC': {
    key: 'UTC',
    timezone: 0,
    name: '格林威治标准时间'
  },
  'UTC-1': {
    key: 'UTC-1',
    timezone: -1,
    name: '达塔德尔加达-西一区'
  },
  'UTC-2': {
    key: 'UTC-2',
    timezone: -2,
    name: '华盛顿-西二区'
  },
  'UTC-3': {
    key: 'UTC-3',
    timezone: -3,
    name: '巴西利亚-西三区'
  },
  'UTC-4': {
    key: 'UTC-4',
    timezone: -4,
    name: '加拉加斯-西四区'
  },
  'UTC-5': {
    key: 'UTC-5',
    timezone: -5,
    name: '纽约-西五区'
  },
  'UTC-6': {
    key: 'UTC-6',
    timezone: -6,
    name: '墨西哥城-西六区'
  },
  'UTC-7': {
    key: 'UTC-7',
    timezone: -7,
    name: '盐湖城-西七区'
  },
  'UTC-8': {
    key: 'UTC-8',
    timezone: -8,
    name: '洛杉矶-西八区'
  },
  'UTC-9': {
    key: 'UTC-9',
    timezone: -9,
    name: '朱诺-西九区'
  },
  'UTC-10': {
    key: 'UTC-10',
    timezone: -10,
    name: '檀香山-西十区'
  },
  'UTC-11': {
    key: 'UTC-11',
    timezone: -11,
    name: '中途岛-西十一区'
  },
  'UTC-12': {
    key: 'UTC-12',
    timezone: -12,
    name: '马朱罗-西十二区'
  }
};

let clazzPaymentResultEnum = {
  'ALREADY_JOIN': {
    key: 'ALREADY_JOIN',
    name: '已加入班级'
  },
  'SUCCESS': {
    key: 'SUCCESS',
    name: '成功加入班级'
  },
  'TOPAY': {
    key: 'TOPAY',
    name: '待支付'
  }
};

/**
 * 推文类型
 *
 * @type {{key: {key: string, name: string}}}
 */
let postTypeEnum = {
  'LINK': {
    key: 'LINK',
    name: '外链'
  },
  'CLAZZ_TASK': {
    key: 'CLAZZ_TASK',
    name: '班级任务'
  }
};

/**
 * 推文状态
 *
 * @type {{key: {key: string, name: string}}}
 */
let postStatusEnum = {
  'WAITING': {
    key: 'WAITING',
    name: '待推送'
  },
  'SENDED': {
    key: 'SENDED',
    name: '已推送'
  },
  'FAIL': {
    key: 'FAIL',
    name: '推送失败'
  }
};

/**
 * 定时任务类型
 *
 * @type {{key: {key: string, name: string}}}
 */
let cronJobTypeEnum = {
  'DAILY': {
    key: 'DAILY',
    name: '每日任务'
  },
  'JUST_ONCE': {
    key: 'JUST_ONCE',
    name: '一次性任务'
  }
};

let userSearchTypeEnum = {
  'STUDENT_NUMBER': {
    key: 'STUDENT_NUMBER',
    name: '学号'
  },
  'NAME': {
    key: 'NAME',
    name: '姓名'
  }
};

let withdrawLogTypeEnum = {
  'WECHAT_TRANSFER': {
    key: 'WECHAT_TRANSFER',
    name: '微信企业付款',
  },
  'WECHAT_WITHDRAW': {
    key: 'WECHAT_WITHDRAW',
    name: '微信账单退款'
  }
};

let withdrawTypeEnum = {
  'WECHAT_TRANSFER': {
    key: 'WECHAT_TRANSFER',
    name: '微信企业付款',
  },
  'WECHAT_WITHDRAW': {
    key: 'WECHAT_WITHDRAW',
    name: '微信账单退款'
  },
  'MANUAL_WITHDRAW': {
    key: 'MANUAL_WITHDRAW',
    name: '手动退款'
  }
};

let refundAccountEnum = {
  'REFUND_SOURCE_RECHARGE_FUNDS': {
    key: 'REFUND_SOURCE_RECHARGE_FUNDS',
    name: '可用余额退款/基本账户'
  },
  'REFUND_SOURCE_UNSETTLED_FUNDS': {
    key: 'REFUND_SOURCE_UNSETTLED_FUNDS',
    name: '未结算资金退款'
  }
};

let userEnglishLevelEnum = {
  FRESH_MAN: {
    key: 'FRESH_MAN',
    name: '真的零基础，不信来战'
  },
  CONFUSION: {
    key: 'CONFUSION',
    name: '我感觉我学了多年假英语'
  },
  PROFESSIONAL: {
    key: 'PROFESSIONAL',
    name: '我是英专生，持续成长中'
  },
  NOT_CONFIDENT: {
    key: 'NOT_CONFIDENT',
    name: '能说一些，出口却不自信'
  },
  NATIVE_SPEAKER: {
    key: 'NATIVE_SPEAKER',
    name: '能和华莱士谈笑风生'
  }
};

let userSelfIdentityEnum = {
  NATIVE_SPEAKER: {
    key: 'NATIVE_SPEAKER',
    name: '能和华莱士谈笑风生'
  },
  BOOKWORK: {
    key: 'BOOKWORK',
    name: '能饱览世界群书、禁书'
  },
  LISTENING_FLUENT: {
    key: 'LISTENING_FLUENT',
    name: '看美剧英剧听新闻无压力',
  },
  EXPERT: {
    key: 'EXPERT',
    name: '我就是靠这个吃饭的，叉',
  },
  EXAM_FOCUS: {
    key: 'EXAM_FOCUS',
    name: '不是为了考试我才不学英语'
  }
};

let learningModeEnum = {
  FRIENDS: {
    key: 'FRIENDS',
    name: '和身边的朋友组队学'
  },
  ONLINE: {
    key: 'ONLINE',
    name: '和网路上的朋友一起学'
  },
  ALONE: {
    key: 'ALONE',
    name: '我就想一个人学'
  }
};

/**
 * 推广活动，用户状态
 *
 * @type {{}}
 */
const activityAccountStatusEnum = {
  'NOT_JOIN': {     // 用户未参与
    name: '待加入',
    key: 'NOT_JOIN'
  },
  'PENDING': {      // 已参与，未分配房间
    name: '待分配',
    key: 'PENDING'
  },
  'PROCESSING': {   // 分配房间完成，活动正常进行中
    name: '进行中',
    key: 'PROCESSING'
  },
  'CLOSED': {       // 已关闭
    name: '已关闭',
    key: 'CLOSED'
  }
};

/**
 * 推广活动， 房间状态
 *
 * @type {{}}
 */
const activityRoomStatusEnum = {
  'OPEN': {         // 房间开放中
    name: '开放中',
    key: 'OPEN'
  },
  'CLOSED': {       // 房间已关闭
    name: '已关闭',
    key: 'CLOSED'
  },
  'DISMISSED': {
    name: '已解散',
    key: 'DISMISSED'
  }
};

/**
 * 推广活动类型枚举
 *
 * @type {{}}}
 */
const activityTypeEnum = {
  'MORNING_CALL': {
    name: '早起交友',
    key: 'MORNING_CALL'
  }
};

/**
 * 微信消息类型枚举
 *
 * @type {{}}
 */
const wechatMessageTypeEnum = {
  'voice': {
    key: 'voice',
    name: '语音消息'
  },
  'shortvideo': {
    key: 'shortvideo',
    name: '短视频消息'
  },
  'image': {
    key: 'image',
    name: '图片消息'
  },
  'video': {
    key: 'video',
    name: '视频消息'
  },
  'text': {
    key: 'text',
    name: '文本消息'
  }
};

/**
 * 第三方绑定枚举
 *
 * @type {{EASEMOB: {key: string, name: string}}}
 */
const userBindTypeEnum = {
  'EASEMOB': {
    key: 'EASEMOB',
    name: '环信'
  },
  'WEAPP_ONE': {
    key: 'WEAPP_ONE',
    name: '友班一对一'
  },
  'WECHAT_WEB': {
    key: 'WECHAT_WEB',
    name: '友班WEB'
  },
  'WECHAT_APP_ONE': {
    key: 'WECHAT_APP_ONE',
    name: '笃师一对一'
  },
  'APP_SHARK': {
    key: 'APP_SHARK',
    name: '友班移动应用'
  },
  'PHONE_NUMBER': {
    key: 'PHONE_NUMBER',
    name: '手机密码'
  }
};

/**
 * 环信好友关系状态枚举
 *
 * @type {{EASEMOB: {key: string, name: string}}}
 */
const userEasemobRelationStatusEnum = {
  'APPLYING': {
    key: 'APPLYING',
    name: '待同意'
  },
  'PROCESSING': {
    key: 'PROCESSING',
    name: '进行中'
  },
  'CLOSED': {
    key: 'CLOSED',
    name: '已关闭'
  }
};

/**
 * 笃师一对一反馈记录状态枚举
 *
 * @type {{}}
 */
const clazzFeedbackRecordStatusEnum = {
  'PAYING': {
    name: '待支付️',
    key: 'PAYING'
  },
  'PENDING': {
    name: '待审核',
    key: 'PENDING'
  },
  'WAITING': {
    key: 'WAITING',
    name: '等待中'
  },
  'PROCESSING': {
    key: 'PROCESSING',
    name: '进行中'
  },
  'CANCELED': {
    name: '已取消',
    key: 'CANCELED'
  },
  'COMPLETED': {
    name: '已点评',
    key: 'COMPLETED'
  }
};

/**
 * 用户支付业务类型
 *
 * @type {{}}
 */
const userPayOutbizTypeEnum = {
  'CLAZZPAY': {
    name: '课程账单',
    key: 'CLAZZPAY'
  },
  'WEAPPCLAZZONE': {
    name: '笃师一对一账单',
    key: 'WEAPPCLAZZONE'
  }
};

/**
 * 公开课状态枚举类型
 *
 * @type {{}}}
 */
const openCourseStatusEnum = {
  'PROCESSING': {
    name: '进行中',
    key: 'PROCESSING'
  },
  'CLOSED': {
    name: '关闭',
    key: 'CLOSED'
  }
};

/**
 * 用户公开课关系状态枚举
 *
 * @type {{}}
 */
const userOpenCourseRelationStatusEnum = {
  'APPLYING': {
    key: 'APPLYING',
    name: '待同意'
  },
  'PROCESSING': {
    key: 'PROCESSING',
    name: '进行中'
  },
  'CLOSED': {
    key: 'CLOSED',
    name: '已关闭'
  }
};

/**
 * 推广类型枚举
 *
 * @type {{}}
 */
const promotionTypeEnum = {
  'FIRST_OFFER': {
    key: 'FIRST_OFFER',
    name: '首单优惠'
  },
  'REGISTRATION_INVITATION': {
    key: 'REGISTRATION_INVITATION',
    name: '注册邀请'
  }
};

/**
 * 推广收益状态枚举
 *
 * @type {{}}
 */
const promotionIncomeStatusEnum = {
  'RESERVED': {
    key: 'RESERVED',
    name: '在路上'
  },
  'AVAILABLE': {
    key: 'AVAILABLE',
    name: '可提现'
  },
  'COINED': {
    key: 'COINED',
    name: '已提现'
  },
  'CANCELED': {
    key: 'CANCELED',
    name: '已取消'
  },
};

/**
 * 对话体类型
 *
 * @type {{}}
 */
const clazzPlayDialogTypeEnum = {
  TEXT: {
    key: 'TEXT',
    name: '文本消息',
  },
  'AUDIO': {
    key: 'AUDIO',
    name: '音频消息'
  },
  'IMAGE': {
    key: 'IMAGE',
    name: '图片消息'
  },
  'VIDEO': {
    key: 'VIDEO',
    name: '视频消息'
  }
};

/**
 * 对话体角色类型
 *
 * @type {{}}
 */
const clazzPlayRoleTypeEnum = {
  TEACHER: {
    key: 'TEACHER',
    name: '笃师'
  },
  TEACHING_ASSISTANT: {
    key: 'TEACHING_ASSISTANT',
    name: '助教'
  },
  STUDENT_A: {
    key: 'STUDENT_A',
    name: '学员A'
  },
  STUDENT_B: {
    key: 'STUDENT_B',
    name: '学员B'
  },
  NO_BODY: {
    key: 'NO_BODY',
    name: '无人物'
  }
};

/**
 * 对话体位置类型
 *
 * @type {{}}
 */
const clazzPlayDialogPlacementEnum = {
  LEFT: {
    key: 'LEFT',
    name: '居左'
  },
  RIGHT: {
    key: 'RIGHT',
    name: '居右'
  },
  CENTER: {
    key: 'CENTER',
    name: '居中'
  }
};

/**
 * 对话体背景颜色类型
 *
 * @type {{}}
 */
const clazzPlayDialogColorTypeEnum = {
  DEFAULT: {
    key: 'DEFAULT',
    name: '默认'
  },
  LIGHT_GREY: {
    key: 'LIGHT_GREY',
    name: '浅灰'
  },
  LIGHT_PINK: {
    key: 'LIGHT_PINK',
    name: '浅粉',
  },
  LIGHT_BLUE: {
    key: 'LIGHT_BLUE',
    name: '浅蓝'
  }
};

/**
 * app 平台类型
 *
 * @type {{}}
 */
const appTypeEnum = {
  'IOS': {
    key: 'IOS',
    name: '苹果APP'
  },
  'ANDROID': {
    key: 'ANDROID',
    name: '安卓APP'
  }
};

const systemConfigTypeEnum = {
  'APP_VERSION_ANDROID': {
    key: 'APP_VERSION_ANDROID',
    name: 'android app版本'
  },
  'APP_VERSION_IOS': {
    key: 'APP_VERSION_IOS',
    name: 'ios app 版本'
  },
  'SMS_CONFIG': {
    key: 'SMS_CONFIG',
    name: '短信系统配置'
  },
  'APP_SERVICE_CONFIG':{
    'key': 'APP_SERVICE_CONFIG',
    'name': 'APP 客服配置'
  },
  'APP_CARD_CONFIG':{
    'key': 'APP_CARD_CONFIG',
    'name': 'APP 卡片配置'
  }
};

const userScoreTypeEnum = {
  'CHECKIN_REVIEW': {
    key: 'CHECKIN_REVIEW',
    name: '打卡评分'
  }
};

/**
 * 短信类型
 *
 * @type {{}}
 */
const securityCodeTypeEnum = {
  'REGISTER': {
    key: 'REGISTER',
    name: '帐号注册'
  },
  'RESET_PASSWORD': {
    key: 'RESET_PASSWORD',
    name: '密码重置'
  }
};

const userRankTypeEnum = {
  'checkin': {
    key: 'checkin',
    name: '打卡排行'
  },
  'purchase': {
    key: 'purchase',
    name: '购买课程排行'
  }
};

const advTypeEnum = {
  'BANNER': {
    key: 'BANNER',
    name: '头图'
  },
  'COURSE': {
    key: 'COURSE',
    name: '课程'
  },
  'ADVITISE': {
    key: 'ADVITISE',
    name: '广告'
  },
  'TEACHER': {
    key: 'TEACHER',
    name: '教师'
  },
  'FAVOR':{
    key: 'FAVOR',
    name: '福利'
  }
};

const lessonTypeEnum = {
  'TECH': {
    key: 'TECH',
    name: '技巧'
  },
  'TOOL': {
    key: 'TOOL',
    name: '工具'
  },
  'EXAM': {
    key: 'EXAM',
    name: '考试'
  },
  'BEGINNER': {
    key: 'BEGINNER',
    name: '入门'
  }
}

const lessonLinkTypeEnum = {
  'HTML': {
    key: 'HTML',
    name: '网页内容'
  },
  'URL': {
    key: 'URL',
    name: '链接'
  }
}

/**
 * banner业务枚举
 */
const bannerBizTypeEnum = {
  'LESSON': {
    key: 'LESSON',
    name: '课程相关'
  }
}

/**
 * banner链接类型
 */
const bannerLinkTypeEnum = {
  'URL': {
    key: 'URL',
    name: '链接'
  }
}

// functions
exports.getEnumByKey = function getEnumByKey(key, EnumObj) {
  if (EnumObj[key]) {
    return EnumObj[key];
  }

  return null;
};

//update at 2019-05-24
exports.advTypeEnum = advTypeEnum;

//update at 2018-10-21
exports.shareTypeEnum = shareTypeEnum;

// update at 2018-03-22
exports.ubandCardStatusEnum = ubandCardStatusEnum;
exports.ubandCardTypeEnum = ubandCardTypeEnum;
exports.ubandCardScopeEnum = ubandCardScopeEnum;

// models
exports.clazzTypeEnum = clazzTypeEnum;
exports.qaStatusEnum = qaStatusEnum;
exports.payStatusEnum = payStatusEnum;
exports.checkinStatusEnum = checkinStatusEnum;
exports.genderEnum = genderEnum;
exports.aimEnum = aimEnum;
exports.mediaTypeEnum = mediaTypeEnum;
exports.clazzStatusEnum = clazzStatusEnum;
exports.clazzJoinStatusEnum = clazzJoinStatusEnum;
exports.fileTypeEnum = fileTypeEnum;
exports.feedbackTypeEnum = feedbackTypeEnum;
exports.feedbackStatusEnum = feedbackStatusEnum;
exports.userQuestionStatusEnum = userQuestionStatusEnum;
exports.withdrawStatusEnum = withdrawStatusEnum;
exports.payWayEnum = payWayEnum;
exports.coinBizTypeEnum = coinBizTypeEnum;
exports.clazzHelpTopEnum = clazzHelpTopEnum;
exports.materialTypeEnum = materialTypeEnum;
exports.qiniuFileTypeEnum = qiniuFileTypeEnum;
exports.clazzTaskIntroductionTypeEnum = clazzTaskIntroductionTypeEnum;
exports.operationTypeEnum = operationTypeEnum;
exports.permissionTypeEnum = permissionTypeEnum;
exports.permissionEnum = permissionEnum;
exports.systemerTypeEnum = systemerTypeEnum;
exports.clazzJoinTypeEnum = clazzJoinTypeEnum;
exports.templateMsgTypeEnum = templateMsgTypeEnum;
exports.customizedMsgTypeEnum = customizedMsgTypeEnum;
exports.couponStatusEnum = couponStatusEnum;
exports.checkinPenaltyTypeEnum = checkinPenaltyTypeEnum;
exports.businessCardTypeEnum = businessCardTypeEnum;
exports.shareToTypeEnum = shareToTypeEnum;
exports.soundGameUserInterfaceEnum = soundGameUserInterfaceEnum;
exports.clazzLevelEnum = clazzLevelEnum;
exports.clazzFeedbackReplyTypeEnum = clazzFeedbackReplyTypeEnum;
exports.clazzFeedbackStatusEnum = clazzFeedbackStatusEnum;
exports.timezoneEnum = timezoneEnum;
exports.clazzPaymentResultEnum = clazzPaymentResultEnum;
exports.postTypeEnum = postTypeEnum;
exports.postStatusEnum = postStatusEnum;
exports.cronJobTypeEnum = cronJobTypeEnum;
exports.userSearchTypeEnum = userSearchTypeEnum;
exports.withdrawLogTypeEnum = withdrawLogTypeEnum;
exports.withdrawTypeEnum = withdrawTypeEnum;
exports.refundAccountEnum = refundAccountEnum;
exports.userEnglishLevelEnum = userEnglishLevelEnum;
exports.userSelfIdentityEnum = userSelfIdentityEnum;
exports.learningModeEnum = learningModeEnum;
exports.activityAccountStatusEnum = activityAccountStatusEnum;
exports.activityRoomStatusEnum = activityRoomStatusEnum;
exports.activityTypeEnum = activityTypeEnum;
exports.wechatMessageTypeEnum = wechatMessageTypeEnum;
exports.userBindTypeEnum = userBindTypeEnum;
exports.userEasemobRelationStatusEnum = userEasemobRelationStatusEnum;
exports.clazzFeedbackRecordStatusEnum = clazzFeedbackRecordStatusEnum;
exports.userPayOutbizTypeEnum = userPayOutbizTypeEnum;
exports.openCourseStatusEnum = openCourseStatusEnum;
exports.userOpenCourseRelationStatusEnum = userOpenCourseRelationStatusEnum;
exports.promotionTypeEnum = promotionTypeEnum;
exports.promotionIncomeStatusEnum = promotionIncomeStatusEnum;
exports.clazzPlayDialogTypeEnum = clazzPlayDialogTypeEnum;
exports.clazzPlayRoleTypeEnum = clazzPlayRoleTypeEnum;
exports.clazzPlayDialogPlacementEnum = clazzPlayDialogPlacementEnum;
exports.clazzPlayDialogColorTypeEnum = clazzPlayDialogColorTypeEnum;
exports.appTypeEnum = appTypeEnum;
exports.systemConfigTypeEnum = systemConfigTypeEnum;
exports.clazzExitStatusTypeEnum = withdrawStatusEnum;
exports.userScoreTypeEnum = userScoreTypeEnum;
exports.securityCodeTypeEnum = securityCodeTypeEnum;
exports.userRankTypeEnum = userRankTypeEnum;
exports.lessonTypeEnum = lessonTypeEnum;
exports.lessonLinkTypeEnum = lessonLinkTypeEnum;
exports.bannerBizTypeEnum = bannerBizTypeEnum;
exports.bannerLinkTypeEnum = bannerLinkTypeEnum;
