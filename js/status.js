/**
 * js/status.js
 * 状态与类型文案模块
 * 挂载到 window.Status，供 app.js 调用
 */
(function () {
  'use strict';

  /**
   * 获取信息的状态文案
   * - status === 'active'   → '进行中'
   * - status === 'resolved' 且 type === 'lost'  → '已找到'
   * - status === 'resolved' 且 type === 'found' → '已归还'
   * @param {Object} item
   * @returns {string}
   */
  function getStatusText(item) {
    if (!item) return '';
    if (item.status !== 'resolved') return '进行中';
    return item.type === 'lost' ? '已找到' : '已归还';
  }

  /**
   * 获取信息类型文案
   * @param {string} type 'lost' | 'found'
   * @returns {string}
   */
  function getTypeText(type) {
    if (type === 'lost') return '寻物';
    if (type === 'found') return '招领';
    return '';
  }

  window.Status = {
    getStatusText: getStatusText,
    getTypeText: getTypeText
  };
})();