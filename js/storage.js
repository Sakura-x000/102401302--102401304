/**
 * js/storage.js
 * 数据存储模块：用 localStorage 持久化失物招领信息
 * 挂载到 window.Storage，供 app.js 调用
 */
(function () {
  'use strict';

  var ITEMS_KEY = 'lf_items';        // 信息列表存储 key
  var OWNER_KEY = 'lf_owner_id';     // 当前浏览器 ownerId 存储 key

  function readItems() {
    try {
      var raw = localStorage.getItem(ITEMS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('读取 localStorage 失败，返回空数组', e);
      return [];
    }
  }

  function writeItems(items) {
    try {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('写入 localStorage 失败', e);
    }
  }

  function getAllItems() {
    return readItems();
  }

  function saveItem(item) {
    if (!item || typeof item !== 'object') return null;
    var items = readItems();
    items.push(item);
    writeItems(items);
    return item;
  }

  function updateItem(id, changes) {
    if (!id || !changes || typeof changes !== 'object') return null;
    var items = readItems();
    var target = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        items[i] = Object.assign({}, items[i], changes);
        target = items[i];
        break;
      }
    }
    if (target) writeItems(items);
    return target;
  }

  function getOwnerId() {
    var id = localStorage.getItem(OWNER_KEY);
    if (!id) {
      id = 'owner_' + Date.now().toString(36) + '_' +
           Math.random().toString(36).slice(2, 8);
      localStorage.setItem(OWNER_KEY, id);
    }
    return id;
  }

  // 挂到 window 上，覆盖浏览器原生的 window.Storage 构造函数
  window.Storage = {
    getAllItems: getAllItems,
    saveItem: saveItem,
    updateItem: updateItem,
    getOwnerId: getOwnerId
  };
})();