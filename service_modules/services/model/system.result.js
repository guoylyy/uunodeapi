'use strict';

/**
 * 构造错误类
 */
function BaseError(code, message) {
  if (!code || !message) {
    this.code = 500;
    this.message = '未知系统异常';
  } else {
    this.code = code;
    this.message = message;
  }
}

BaseError.prototype = Object.create(Error.prototype);

/**
 * 分页器
 * @param itemSize
 * @param pageSize
 * @param curPage
 * @constructor
 */
function Paginator(itemSize, pageSize, curPage) {
  this.totalNum = itemSize >= 0 ? parseInt(itemSize) : 0;
  this.pageSize = pageSize >= 0 ? parseInt(pageSize) : this.DEFAULT_ITEMS_PER_PAGE;
  this.totalPageNum = this.getPages();
  this.pageNumber = this.calcPage(parseInt(curPage));
}

/**
 * 分页器原型
 * @type {{DEFAULT_ITEMS_PER_PAGE: number, DEFAULT_SLIDER_SIZE: number, getPages: Paginator.getPages, calcPage: Paginator.calcPage}}
 */
Paginator.prototype = {
  DEFAULT_ITEMS_PER_PAGE: 10,
  getPages: function () {
    if (this.totalNum === 0) {
      return 1;
    }

    return Math.ceil(this.totalNum / this.pageSize);
  },
  calcPage: function (page) {
    page = page || 0;

    if (page < 1) {
      return 1;
    }

    return page;
  }
};


/**
 * 基本的返回数据结构
 * @param code
 * @param message
 * @param data
 * @constructor
 */
function BaseResult(code, message, data) {
  if (data == null) {
    this.data = null;
  } else {
    this.data = data;
  }

  if (!code || !message) {
    this.code = 500;
    this.message = '未知系统异常';
  } else {
    this.code = code;
    this.message = message;
  }
}

/**
 * 带分页器的数据结构
 * @param values
 * @param itemSize
 * @param pageSize
 * @param curPage
 * @constructor
 */
function PageResult(values, itemSize, pageSize, curPage) {
  this.code = 200;
  this.message = '操作成功';
  this.data = {
    values: values,
    paginator: new Paginator(itemSize, pageSize, curPage)
  };
}

exports.BaseError = BaseError;
exports.BaseResult = BaseResult;
exports.PageResult = PageResult;
