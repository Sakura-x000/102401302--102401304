/**
 * js/validate.js
 * 发布信息校验模块
 * 挂载到 window.Validate，供 app.js 调用
 */
(function () {
  'use strict';

  /**
   * 校验一条发布信息
   * @param {Object} data 表单数据
   * @returns {{ valid: boolean, errors: Object }}
   */
  function validateItem(data) {
    var errors = {};
    data = data || {};

    if (!data.title || !String(data.title).trim()) {
      errors.title = '物品名称不能为空';
    } else if (String(data.title).trim().length > 50) {
      errors.title = '物品名称不能超过 50 字';
    }

    if (!data.type) {
      errors.type = '请选择类型';
    } else if (data.type !== 'lost' && data.type !== 'found') {
      errors.type = '类型只能是寻物或招领';
    }

    if (!data.location || !String(data.location).trim()) {
      errors.location = '地点不能为空';
    }

    if (!data.publisher || !String(data.publisher).trim()) {
      errors.publisher = '发布者不能为空';
    }

    if (!data.contact || !String(data.contact).trim()) {
      errors.contact = '联系方式不能为空';
    } else if (String(data.contact).trim().length < 3) {
      errors.contact = '联系方式至少 3 个字符';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  window.Validate = {
    validateItem: validateItem
  };
})();