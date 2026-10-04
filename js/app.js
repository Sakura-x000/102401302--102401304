(function () {
  'use strict';

  // ===== 临时 mock（搭档模块完成后删除此段） =====
  // 注意：浏览器原生存在 window.Storage 构造函数，不能直接用 `window.Storage || mock` 判断，
  // 必须检测具体方法是否存在，否则会误用到原生对象导致 getAllItems 报错。
  const Storage = (window.Storage && typeof window.Storage.getAllItems === 'function')
    ? window.Storage
    : {
        _items: [],
        getAllItems() { return this._items; },
        saveItem(item) { this._items.push(item); return item; },
        updateItem(id, changes) {
          const it = this._items.find(i => i.id === id);
          if (it) Object.assign(it, changes);
          return it;
        },
        getOwnerId() { return 'owner_demo'; }
      };

  const Validate = (window.Validate && typeof window.Validate.validateItem === 'function')
    ? window.Validate
    : {
        validateItem(d) {
          const e = {};
          if (!d.title || !d.title.trim())       e.title = '物品名称不能为空';
          if (!d.type)                            e.type = '请选择类型';
          if (!d.location || !d.location.trim())  e.location = '地点不能为空';
          if (!d.publisher || !d.publisher.trim())e.publisher = '发布者不能为空';
          if (!d.contact || !d.contact.trim())    e.contact = '联系方式不能为空';
          return { valid: Object.keys(e).length === 0, errors: e };
        }
      };

  const Search = (window.Search && typeof window.Search.filterItems === 'function')
    ? window.Search
    : {
        filterItems(items, f = {}) {
          const kw = (f.keyword || '').trim().toLowerCase();
          return items.filter(it => {
            if (f.type && it.type !== f.type) return false;
            if (f.category && it.category !== f.category) return false;
            if (f.status && it.status !== f.status) return false;
            if (f.ownerId && it.ownerId !== f.ownerId) return false;
            if (kw) {
              const s = [it.title, it.description, it.location].filter(Boolean).join(' ').toLowerCase();
              if (!s.includes(kw)) return false;
            }
            return true;
          }).sort((a, b) => b.createdAt - a.createdAt);
        }
      };

  const Status = (window.Status && typeof window.Status.getStatusText === 'function')
    ? window.Status
    : {
        getStatusText(it) {
          return it.status === 'resolved'
            ? (it.type === 'lost' ? '已找到' : '已归还')
            : '进行中';
        },
        getTypeText(t) { return t === 'lost' ? '寻物' : '招领'; }
      };

  // ===== 状态 =====
  const state = {
    filters: { keyword: '', type: '', category: '', status: '', ownerId: '' }
  };

  const $ = id => document.getElementById(id);

  // 物品类别（与发布表单保持一致）
  const CATEGORIES = ['证件', '电子产品', '书籍', '衣物', '钥匙', '其他'];

  // ===== 工具函数 =====
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2000);
  }

  // ===== 筛选状态提示 =====
  function updateFilterHint() {
    const f = state.filters;
    const parts = [];
    if (f.keyword)  parts.push('关键词「' + f.keyword + '」');
    if (f.type)     parts.push(f.type === 'lost' ? '寻物' : '招领');
    if (f.category) parts.push(f.category);
    if (f.status)   parts.push(f.status === 'active' ? '进行中' : '已结束');
    if (f.ownerId)  parts.push('我的发布');

    const hint = $('filterHint');
    const btnMine = $('btnMyItems');
    btnMine.classList.toggle('active', !!f.ownerId);

    if (!parts.length) {
      hint.classList.add('hidden');
      hint.innerHTML = '';
      return;
    }
    hint.classList.remove('hidden');
    hint.innerHTML =
      '<span>当前筛选：' + escapeHtml(parts.join(' · ')) + '</span>' +
      '<button type="button" class="hint-clear" id="btnHintClear">清除筛选</button>';
    $('btnHintClear').addEventListener('click', () => $('btnReset').click());
  }

  // 填充「类别筛选」下拉框
  function initCategoryFilter() {
    const sel = $('filterCategory');
    // 保留第一项「全部类别」
    sel.innerHTML = '<option value="">全部类别</option>' +
      CATEGORIES.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
  }

  // 发布表单日期默认今天
  function setDefaultDate() {
    const input = document.querySelector('input[name="eventDate"]');
    if (input && !input.value) {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      input.value = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    }
  }

  // 首次打开列表为空时，填充示例数据，避免空白页
  function seedIfEmpty() {
    if (Storage.getAllItems().length > 0) return;
    const ownerId = Storage.getOwnerId();
    const now = Date.now();
    const samples = [
      { type: 'lost',  title: '校园卡',          category: '证件',    location: '一食堂二楼',
        publisher: '张同学', contact: 'wx:zhang2024', description: '蓝色卡套，正面有轻微划痕，捡到请联系，有偿感谢！',
        ownerId: ownerId, createdAt: now - 1000 * 60 * 30 },
      { type: 'found', title: '黑色雨伞',        category: '其他',    location: '图书馆三楼自习区',
        publisher: '李同学', contact: 'QQ 123456789',   description: '长柄黑色雨伞，伞柄处有挂绳', ownerId: 'other_1',
        createdAt: now - 1000 * 60 * 60 * 3 },
      { type: 'lost',  title: 'AirPods Pro 耳机', category: '电子产品', location: '体育馆看台',
        publisher: '王同学', contact: '13800001111',    description: '白色耳机盒，盒内有一只左耳耳机', ownerId: ownerId,
        status: 'resolved', createdAt: now - 1000 * 60 * 60 * 26 },
      { type: 'found', title: '一串钥匙',        category: '钥匙',    location: '教学楼 B 栋 201',
        publisher: '赵同学', contact: 'zhao@qq.com',    description: '约 5 把钥匙，带一个小熊挂件', ownerId: 'other_2',
        createdAt: now - 1000 * 60 * 60 * 50 },
      { type: 'lost',  title: '《算法导论》',     category: '书籍',    location: '宿舍 7 号楼楼下',
        publisher: '陈同学', contact: 'chen_wechat',    description: '书内有笔记，扉页写有名字', ownerId: 'other_3',
        createdAt: now - 1000 * 60 * 60 * 72 }
    ];
    samples.forEach(s => {
      Storage.saveItem(Object.assign({
        id: 'seed_' + Math.random().toString(36).slice(2, 10),
        eventDate: '',
        status: 'active',
        description: ''
      }, s));
    });
  }

  // ===== 渲染卡片列表 =====
  function renderList() {
    updateFilterHint();
    const items = Storage.getAllItems();
    const list = Search.filterItems(items, state.filters);
    const container = $('itemList');

    if (!list.length) {
      const msg = state.filters.ownerId
        ? '你还没有发布过信息，点击右上角「发布信息」试试吧～'
        : '没有找到匹配的信息，换个关键词试试～';
      container.innerHTML =
        '<div class="empty"><div class="empty-icon">📭</div><p>' + msg + '</p></div>';
      return;
    }

    container.innerHTML = list.map(it => {
      const resolved = it.status === 'resolved';
      const isOwner = it.ownerId === Storage.getOwnerId();
      const typeCls = it.type === 'lost' ? 'tag-lost' : 'tag-found';
      const cardCls = ['card',
        it.type === 'found' ? 'card-found' : '',
        resolved ? 'card-resolved' : ''
      ].filter(Boolean).join(' ');

      return '<article class="' + cardCls + '" data-id="' + escapeHtml(it.id) + '">' +
        '<div class="card-head">' +
          '<span>' +
            '<span class="tag ' + typeCls + '">' + Status.getTypeText(it.type) + '</span>' +
            (isOwner ? ' <span class="tag tag-mine">我发布的</span>' : '') +
          '</span>' +
          '<span class="status-badge ' + (resolved ? 'status-resolved' : 'status-active') + '">' +
            Status.getStatusText(it) +
          '</span>' +
        '</div>' +
        '<h3>' + escapeHtml(it.title) + '</h3>' +
        '<p>' + escapeHtml(it.description || '暂无描述') + '</p>' +
        '<div class="card-meta">' +
          '<span>📍 ' + escapeHtml(it.location) + '</span>' +
          '<span>' + formatTime(it.createdAt) + '</span>' +
        '</div>' +
      '</article>';
    }).join('');

    container.querySelectorAll('.card').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.id));
    });
  }

  // ===== 详情弹窗 =====
  function openDetail(id) {
    const it = Storage.getAllItems().find(i => i.id === id);
    if (!it) return;

    const isOwner = it.ownerId === Storage.getOwnerId();
    const resolved = it.status === 'resolved';

    $('detailBody').innerHTML =
      '<h2 style="margin-bottom:16px;">' + escapeHtml(it.title) + '</h2>' +
      '<div class="detail-row"><strong>类型：</strong>' + Status.getTypeText(it.type) + '</div>' +
      '<div class="detail-row"><strong>状态：</strong>' + Status.getStatusText(it) + '</div>' +
      '<div class="detail-row"><strong>类别：</strong>' + escapeHtml(it.category || '其他') + '</div>' +
      '<div class="detail-row"><strong>地点：</strong>' + escapeHtml(it.location) + '</div>' +
      (it.eventDate ? '<div class="detail-row"><strong>日期：</strong>' + escapeHtml(it.eventDate) + '</div>' : '') +
      '<div class="detail-row"><strong>发布时间：</strong>' + formatTime(it.createdAt) + '</div>' +
      '<div class="detail-row"><strong>发布者：</strong>' + escapeHtml(it.publisher) + '</div>' +
      '<div class="detail-row"><strong>联系方式：</strong>' + escapeHtml(it.contact) + '</div>' +
      '<div class="detail-row"><strong>描述：</strong>' + escapeHtml(it.description || '暂无') + '</div>' +
      '<div class="detail-actions">' +
        '<button class="btn btn-search" id="btnCopy">📋 复制联系方式</button>' +
        (isOwner && !resolved
          ? '<button class="btn btn-outline" id="btnResolve">标记为' +
              (it.type === 'lost' ? '已找到' : '已归还') + '</button>'
          : '') +
      '</div>';

    $('detailModal').classList.remove('hidden');

    // 复制联系方式
    $('btnCopy').addEventListener('click', () => {
      const text = it.contact;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(() => showToast('联系方式已复制'))
          .catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    });

    // 标记已解决
    const btnResolve = $('btnResolve');
    if (btnResolve) {
      btnResolve.addEventListener('click', () => {
        Storage.updateItem(id, { status: 'resolved' });
        renderList();
        openDetail(id);
        showToast('已标记为' +
          Status.getStatusText({ type: it.type, status: 'resolved' }));
      });
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('联系方式已复制');
    } catch (e) {
      showToast('复制失败，请手动复制');
    }
    document.body.removeChild(ta);
  }

  function closeDetail() {
    $('detailModal').classList.add('hidden');
  }

  // ===== 发布表单 =====
  function handlePublish(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData($('publishForm')).entries());
    const r = Validate.validateItem(data);

    if (!r.valid) {
      showToast(Object.values(r.errors)[0]);
      return;
    }

    Storage.saveItem({
      id: 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      type: data.type,
      title: data.title.trim(),
      category: data.category || '其他',
      location: data.location.trim(),
      eventDate: data.eventDate || '',
      publisher: data.publisher.trim(),
      contact: data.contact.trim(),
      description: (data.description || '').trim(),
      status: 'active',
      ownerId: Storage.getOwnerId(),
      createdAt: Date.now()
    });

    $('publishForm').reset();
    $('publishPanel').classList.add('hidden');
    renderList();
    showToast('发布成功！');
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    $('btnSearch').addEventListener('click', () => {
      state.filters = {
        keyword: $('inputKeyword').value,
        type: $('filterType').value,
        category: $('filterCategory').value,
        status: $('filterStatus').value,
        ownerId: ''
      };
      renderList();
    });

    $('inputKeyword').addEventListener('keydown', e => {
      if (e.key === 'Enter') $('btnSearch').click();
    });

    // 下拉筛选变化即实时刷新，无需再点搜索
    ['filterType', 'filterCategory', 'filterStatus'].forEach(id => {
      $(id).addEventListener('change', () => $('btnSearch').click());
    });

    $('btnReset').addEventListener('click', () => {
      $('inputKeyword').value = '';
      $('filterType').value = '';
      $('filterCategory').value = '';
      $('filterStatus').value = '';
      state.filters = { keyword: '', type: '', category: '', status: '', ownerId: '' };
      renderList();
    });

    $('btnMyItems').addEventListener('click', () => {
      state.filters = {
        keyword: '', type: '', category: '', status: '',
        ownerId: Storage.getOwnerId()
      };
      renderList();
    });

    $('btnShowForm').addEventListener('click', () => {
      $('publishPanel').classList.toggle('hidden');
    });

    $('btnCancelForm').addEventListener('click', () => {
      $('publishPanel').classList.add('hidden');
    });

    $('publishForm').addEventListener('submit', handlePublish);

    $('detailModal').addEventListener('click', e => {
      if (e.target.dataset.close !== undefined || e.target.closest('[data-close]')) {
        closeDetail();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDetail();
    });
  }

  // ===== 初始化 =====
  document.addEventListener('DOMContentLoaded', () => {
    initCategoryFilter();
    setDefaultDate();
    seedIfEmpty();
    bindEvents();
    renderList();
  });

})();