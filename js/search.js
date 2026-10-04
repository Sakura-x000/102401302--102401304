/**
 * js/search.js
 * 搜索与筛选模块
 * 挂载到 window.Search，供 app.js 调用
 */
(function () {
  'use strict';

  /**
   * 按筛选条件过滤并排序信息列表
   * @param {Array} items 全部信息
   * @param {Object} filters 筛选条件 { keyword, type, category, status, ownerId }
   * @returns {Array} 过滤后的信息（按 createdAt 倒序）
   */
  function filterItems(items, filters) {
    filters = filters || {};
    if (!Array.isArray(items)) return [];

    var keyword = String(filters.keyword || '').trim().toLowerCase();

    var result = items.filter(function (it) {
      if (!it) return false;

      if (filters.type && it.type !== filters.type) return false;
      if (filters.category && it.category !== filters.category) return false;
      if (filters.status && it.status !== filters.status) return false;
      if (filters.ownerId && it.ownerId !== filters.ownerId) return false;

      if (keyword) {
        var haystack = [
          it.title,
          it.description,
          it.location,
          it.publisher,
          it.category
        ].filter(Boolean).join(' ').toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }

      return true;
    });

    // 按发布时间倒序（新的在前）
    result.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return result;
  }

  window.Search = {
    filterItems: filterItems
  };
})();