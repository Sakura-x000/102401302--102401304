/**
 * test/unit.test.js
 * 校园失物招领 - 单元测试
 * 测试 storage / validate / search / status 四个模块
 *
 * 运行：npm test
 */
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ---------- 模拟浏览器环境 ----------
global.window = {};

const storageMap = new Map();
global.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

// 加载四个模块（把文件内容跑一遍，模块会自动挂到 window 上）
['storage.js', 'validate.js', 'search.js', 'status.js'].forEach((m) => {
  const code = fs.readFileSync(path.join(rootDir, 'js', m), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
});

// 取引用，方便调用
const Storage = window.Storage;
const Validate = window.Validate;
const Search = window.Search;
const Status = window.Status;

// ---------- 测试 ----------

describe('Storage 模块', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('空 localStorage 时 getAllItems 返回空数组', () => {
    const items = Storage.getAllItems();
    expect(items).to.be.an('array').that.is.empty;
  });

  it('saveItem 能把一条信息存入 localStorage', () => {
    const item = { id: 'i1', title: '校园卡' };
    Storage.saveItem(item);
    const items = Storage.getAllItems();
    expect(items).to.have.lengthOf(1);
    expect(items[0].title).to.equal('校园卡');
  });

  it('saveItem 多条后 getAllItems 返回全部', () => {
    Storage.saveItem({ id: 'i1', title: 'A' });
    Storage.saveItem({ id: 'i2', title: 'B' });
    Storage.saveItem({ id: 'i3', title: 'C' });
    expect(Storage.getAllItems()).to.have.lengthOf(3);
  });

  it('updateItem 能按 id 修改字段', () => {
    Storage.saveItem({ id: 'i1', title: '校园卡', status: 'active' });
    Storage.updateItem('i1', { status: 'resolved' });
    const items = Storage.getAllItems();
    expect(items[0].status).to.equal('resolved');
    expect(items[0].title).to.equal('校园卡');
  });

  it('updateItem 对不存在的 id 返回 null', () => {
    Storage.saveItem({ id: 'i1', title: 'A' });
    const r = Storage.updateItem('not-exist', { title: 'B' });
    expect(r).to.be.null;
  });

  it('getOwnerId 首次调用生成 id 并持久化', () => {
    const id1 = Storage.getOwnerId();
    const id2 = Storage.getOwnerId();
    expect(id1).to.be.a('string').with.length.greaterThan(0);
    expect(id2).to.equal(id1);
  });
});

describe('Validate 模块', () => {
  it('完全空的表单校验不通过', () => {
    const r = Validate.validateItem({});
    expect(r.valid).to.be.false;
    expect(r.errors).to.have.keys(['title', 'type', 'location', 'publisher', 'contact']);
  });

  it('缺少物品名称时提示', () => {
    const r = Validate.validateItem({
      type: 'lost', location: '食堂', publisher: '张三', contact: 'wx:zs'
    });
    expect(r.valid).to.be.false;
    expect(r.errors.title).to.equal('物品名称不能为空');
  });

  it('缺少联系方式时提示', () => {
    const r = Validate.validateItem({
      type: 'lost', title: '校园卡', location: '食堂', publisher: '张三'
    });
    expect(r.valid).to.be.false;
    expect(r.errors.contact).to.equal('联系方式不能为空');
  });

  it('联系方式少于 3 字符时提示', () => {
    const r = Validate.validateItem({
      type: 'lost', title: '校园卡', location: '食堂',
      publisher: '张三', contact: 'ab'
    });
    expect(r.valid).to.be.false;
    expect(r.errors.contact).to.equal('联系方式至少 3 个字符');
  });

  it('类型不合法时提示', () => {
    const r = Validate.validateItem({
      type: 'xxx', title: '校园卡', location: '食堂',
      publisher: '张三', contact: 'wx:zs'
    });
    expect(r.valid).to.be.false;
    expect(r.errors.type).to.equal('类型只能是寻物或招领');
  });

  it('完整且合法的表单校验通过', () => {
    const r = Validate.validateItem({
      type: 'lost', title: '校园卡', location: '一食堂',
      publisher: '张三', contact: 'wx:zhangsan'
    });
    expect(r.valid).to.be.true;
    expect(r.errors).to.be.empty;
  });
});

describe('Search 模块', () => {
  const sample = [
    { id: '1', type: 'lost',  category: '证件', title: '校园卡',   description: '蓝色卡套', location: '一食堂', status: 'active',   ownerId: 'me',    createdAt: 100 },
    { id: '2', type: 'found', category: '其他', title: '黑色雨伞', description: '长柄',     location: '图书馆', status: 'active',   ownerId: 'other', createdAt: 200 },
    { id: '3', type: 'lost',  category: '电子', title: '耳机',     description: '白色',     location: '体育馆', status: 'resolved', ownerId: 'me',    createdAt: 300 },
    { id: '4', type: 'found', category: '钥匙', title: '一串钥匙', description: '小熊挂件', location: '教学楼', status: 'active',   ownerId: 'other', createdAt: 400 }
  ];

  it('无筛选时返回全部，并按 createdAt 倒序', () => {
    const r = Search.filterItems(sample, {});
    expect(r).to.have.lengthOf(4);
    expect(r[0].id).to.equal('4');
    expect(r[3].id).to.equal('1');
  });

  it('按关键词搜索标题', () => {
    const r = Search.filterItems(sample, { keyword: '校园卡' });
    expect(r).to.have.lengthOf(1);
    expect(r[0].id).to.equal('1');
  });

  it('按关键词搜索描述', () => {
    const r = Search.filterItems(sample, { keyword: '小熊' });
    expect(r).to.have.lengthOf(1);
    expect(r[0].id).to.equal('4');
  });

  it('关键词无匹配时返回空数组', () => {
    const r = Search.filterItems(sample, { keyword: '不存在的物品' });
    expect(r).to.be.an('array').that.is.empty;
  });

  it('按类型筛选', () => {
    const r = Search.filterItems(sample, { type: 'lost' });
    expect(r).to.have.lengthOf(2);
    r.forEach((it) => expect(it.type).to.equal('lost'));
  });

  it('按类别筛选', () => {
    const r = Search.filterItems(sample, { category: '钥匙' });
    expect(r).to.have.lengthOf(1);
    expect(r[0].id).to.equal('4');
  });

  it('按状态筛选', () => {
    const r = Search.filterItems(sample, { status: 'resolved' });
    expect(r).to.have.lengthOf(1);
    expect(r[0].id).to.equal('3');
  });

  it('按 ownerId 筛选（我的发布）', () => {
    const r = Search.filterItems(sample, { ownerId: 'me' });
    expect(r).to.have.lengthOf(2);
    r.forEach((it) => expect(it.ownerId).to.equal('me'));
  });

  it('组合筛选：type + status', () => {
    const r = Search.filterItems(sample, { type: 'lost', status: 'active' });
    expect(r).to.have.lengthOf(1);
    expect(r[0].id).to.equal('1');
  });

  it('items 非数组时返回空数组', () => {
    expect(Search.filterItems(null, {})).to.be.an('array').that.is.empty;
    expect(Search.filterItems(undefined, {})).to.be.an('array').that.is.empty;
  });
});

describe('Status 模块', () => {
  it('getTypeText: lost → 寻物', () => {
    expect(Status.getTypeText('lost')).to.equal('寻物');
  });

  it('getTypeText: found → 招领', () => {
    expect(Status.getTypeText('found')).to.equal('招领');
  });

  it('getTypeText: 未知类型返回空字符串', () => {
    expect(Status.getTypeText('xxx')).to.equal('');
  });

  it('getStatusText: active 时返回进行中', () => {
    expect(Status.getStatusText({ status: 'active', type: 'lost' })).to.equal('进行中');
    expect(Status.getStatusText({ status: 'active', type: 'found' })).to.equal('进行中');
  });

  it('getStatusText: 寻物 resolved → 已找到', () => {
    expect(Status.getStatusText({ status: 'resolved', type: 'lost' })).to.equal('已找到');
  });

  it('getStatusText: 招领 resolved → 已归还', () => {
    expect(Status.getStatusText({ status: 'resolved', type: 'found' })).to.equal('已归还');
  });

  it('getStatusText: 空对象不报错', () => {
    expect(Status.getStatusText(null)).to.equal('');
  });
});