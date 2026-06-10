import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInheritance } from '@/composables/useInheritance';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';

function makeTpl(): Template {
  return {
    id: 'tpl_inherit',
    name: '继承测试',
    columns: [
      { id: 'c0', header: '姓名', type: 'text', required: false, isEditable: false, included: true, uniqueValues: [] },
      { id: 'c1', header: '数量', type: 'number', required: false, isEditable: true, included: true, uniqueValues: [] },
      { id: 'c2', header: '状态', type: 'text', required: false, isEditable: true, included: true, uniqueValues: [] },
    ],
    rows: [
      { '姓名': '张三', '数量': '10', '状态': '' },
      { '姓名': '李四', '数量': '20', '状态': '' },
    ],
    filterField: '',
    titleFields: [],
    rules: [],
  };
}

describe('useInheritance', () => {
  let dataStore: ReturnType<typeof useDataStore>;
  let inheritance: ReturnType<typeof useInheritance>;

  beforeEach(() => {
    setActivePinia(createPinia());
    dataStore = useDataStore();
    inheritance = useInheritance();
  });

  it('无任何数据时继承基础数据', () => {
    const tpl = makeTpl();
    const results = inheritance.batchGetEffectiveRows(tpl, '2024-01-15', '张三');
    expect(results[0]['数量'].val).toBe('10');
    expect(results[0]['数量'].src).toBe('base');
    expect(results[0]['状态'].val).toBe('');
    expect(results[0]['状态'].src).toBe('empty');
  });

  it('今日有数据时继承今日数据', () => {
    const tpl = makeTpl();
    dataStore.sub['tpl_inherit'] = {
      '2024-01-15': {
        '张三': {
          '0': { '数量': '50', '状态': '已完成' },
        },
      },
    };
    const results = inheritance.batchGetEffectiveRows(tpl, '2024-01-15', '张三');
    expect(results[0]['数量'].val).toBe('50');
    expect(results[0]['数量'].src).toBe('today');
    expect(results[0]['状态'].val).toBe('已完成');
    expect(results[0]['状态'].src).toBe('today');
  });

  it('今日无数据但昨日有数据时继承昨日', () => {
    const tpl = makeTpl();
    dataStore.sub['tpl_inherit'] = {
      '2024-01-14': {
        '张三': {
          '0': { '数量': '30', '状态': '进行中' },
        },
      },
    };
    const results = inheritance.batchGetEffectiveRows(tpl, '2024-01-15', '张三');
    expect(results[0]['数量'].val).toBe('30');
    expect(results[0]['数量'].src).toBe('prev');
    expect(results[0]['状态'].val).toBe('进行中');
    expect(results[0]['状态'].src).toBe('prev');
  });

  it('今日已提交（即使全空）不回退历史', () => {
    const tpl = makeTpl();
    dataStore.sub['tpl_inherit'] = {
      '2024-01-14': {
        '张三': {
          '0': { '数量': '30', '状态': '进行中' },
        },
      },
      '2024-01-15': {
        '张三': {
          '0': { '数量': '', '状态': '' },
        },
      },
    };
    const results = inheritance.batchGetEffectiveRows(tpl, '2024-01-15', '张三');
    // 今日已提交（即使全空），不回退历史
    expect(results[0]['数量'].src).not.toBe('prev');
    expect(results[0]['状态'].src).not.toBe('prev');
  });

  it('行级继承：不混合跨日期字段', () => {
    const tpl = makeTpl();
    dataStore.sub['tpl_inherit'] = {
      '2024-01-13': {
        '张三': {
          '0': { '数量': '100', '状态': '' },
        },
      },
      '2024-01-14': {
        '张三': {
          '0': { '数量': '', '状态': '最新状态' },
        },
      },
    };
    const results = inheritance.batchGetEffectiveRows(tpl, '2024-01-15', '张三');
    // 应继承最近一次（1月14日）的整行数据
    expect(results[0]['状态'].val).toBe('最新状态');
    expect(results[0]['状态'].src).toBe('prev');
    // 1月14日数量为空，不从1月13日混合继承
    expect(results[0]['数量'].val).toBe('');
  });

  it('多行独立继承', () => {
    const tpl = makeTpl();
    dataStore.sub['tpl_inherit'] = {
      '2024-01-15': {
        '张三': {
          '0': { '数量': '50', '状态': '已完成' },
        },
      },
    };
    const results = inheritance.batchGetEffectiveRows(tpl, '2024-01-15', '张三');
    // 第0行：今日数据
    expect(results[0]['数量'].src).toBe('today');
    // 第1行：基础数据
    expect(results[1]['数量'].val).toBe('20');
    expect(results[1]['数量'].src).toBe('base');
  });

  it('getEffectiveRowAll 返回单行数据', () => {
    const tpl = makeTpl();
    const row = inheritance.getEffectiveRowAll(tpl, 0, '2024-01-15', '张三');
    expect(row['数量'].val).toBe('10');
    expect(row['数量'].src).toBe('base');
  });

  it('getEffectiveVal 返回单字段数据', () => {
    const tpl = makeTpl();
    const val = inheritance.getEffectiveVal(tpl, 0, '数量', '2024-01-15', '张三');
    expect(val.val).toBe('10');
    expect(val.src).toBe('base');
  });

  it('getEffectiveVal 不存在的字段返回 empty', () => {
    const tpl = makeTpl();
    const val = inheritance.getEffectiveVal(tpl, 0, '不存在', '2024-01-15', '张三');
    expect(val.val).toBe('');
    expect(val.src).toBe('empty');
  });

  it('hasTodayData: 今日有数据返回 true', () => {
    const tpl = makeTpl();
    dataStore.sub['tpl_inherit'] = {
      '2024-01-15': {
        '张三': {
          '0': { '数量': '50', '状态': '' },
        },
      },
    };
    expect(inheritance.hasTodayData(tpl, '2024-01-15', '张三')).toBe(true);
  });

  it('hasTodayData: 今日无数据返回 false', () => {
    const tpl = makeTpl();
    expect(inheritance.hasTodayData(tpl, '2024-01-15', '张三')).toBe(false);
  });

  it('hasPrevData: 昨日有数据返回 true', () => {
    const tpl = makeTpl();
    dataStore.sub['tpl_inherit'] = {
      '2024-01-14': {
        '张三': {
          '0': { '数量': '30', '状态': '' },
        },
      },
    };
    expect(inheritance.hasPrevData(tpl, '2024-01-15', '张三')).toBe(true);
  });

  it('hasPrevData: 昨日无数据返回 false', () => {
    const tpl = makeTpl();
    expect(inheritance.hasPrevData(tpl, '2024-01-15', '张三')).toBe(false);
  });
});
