import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';

describe('useDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('初始状态正确', () => {
    const store = useDataStore();
    expect(store.tpls).toEqual([]);
    expect(store.members).toEqual({});
    expect(store.sub).toEqual({});
    expect(store.serverConnected).toBe(false);
    expect(store.connectionStatus).toBe('loading');
    expect(store.activeTemplateId).toBe('');
    expect(store.currentFillUser).toBe('');
  });

  it('activeTemplate 无选中时返回 null', () => {
    const store = useDataStore();
    expect(store.activeTemplate).toBeNull();
  });

  it('setActiveTemplate 设置激活模板', () => {
    const store = useDataStore();
    const tpl: Template = {
      id: 'tpl_1',
      name: '测试模板',
      columns: [],
      rows: [],
      filterField: '',
      titleFields: [],
      rules: [],
    };
    store.tpls = [tpl];
    store.setActiveTemplate('tpl_1');
    expect(store.activeTemplateId).toBe('tpl_1');
    expect(store.activeTemplate).toEqual(tpl);
  });

  it('setCurrentFillUser 设置填报人', () => {
    const store = useDataStore();
    store.setCurrentFillUser('张三');
    expect(store.currentFillUser).toBe('张三');
  });

  it('getTpl 返回指定模板', () => {
    const store = useDataStore();
    const tpl: Template = {
      id: 'tpl_1',
      name: '测试',
      columns: [],
      rows: [],
      filterField: '',
      titleFields: [],
      rules: [],
    };
    store.tpls = [tpl];
    expect(store.getTpl('tpl_1')).toEqual(tpl);
    expect(store.getTpl('tpl_2')).toBeUndefined();
  });

  it('getTplMembers 返回成员列表', () => {
    const store = useDataStore();
    store.members = { tpl_1: ['张三', '李四'] };
    expect(store.getTplMembers('tpl_1')).toEqual(['张三', '李四']);
    expect(store.getTplMembers('tpl_2')).toEqual([]);
  });

  it('getTplSub 返回提交数据', () => {
    const store = useDataStore();
    store.sub = { tpl_1: { '2024-01-15': { '张三': { '0': { '数量': '10' } } } } };
    const sub = store.getTplSub('tpl_1');
    expect(sub['2024-01-15']['张三']['0']['数量']).toBe('10');
  });

  it('allMembers 去重汇总所有成员', () => {
    const store = useDataStore();
    store.members = {
      tpl_1: ['张三', '李四'],
      tpl_2: ['李四', '王五'],
    };
    const all = store.allMembers;
    expect(all).toContain('张三');
    expect(all).toContain('李四');
    expect(all).toContain('王五');
    expect(all.length).toBe(3);
  });

  it('totalRecords 统计总记录数', () => {
    const store = useDataStore();
    store.sub = {
      tpl_1: {
        '2024-01-15': {
          '张三': { '0': { '数量': '10' }, '1': { '数量': '20' } },
          '李四': { '0': { '数量': '30' } },
        },
      },
    };
    expect(store.totalRecords).toBe(2);
  });

  it('createTemplateLocal 本地创建模板', () => {
    const store = useDataStore();
    const tpl: Template = {
      id: 'tpl_new',
      name: '新模板',
      columns: [],
      rows: [],
      filterField: '',
      titleFields: [],
      rules: [],
    };
    store.createTemplateLocal(tpl);
    expect(store.tpls).toContainEqual(tpl);
    expect(store.members['tpl_new']).toEqual([]);
  });

  it('createTemplateLocal 不重复添加', () => {
    const store = useDataStore();
    const tpl: Template = {
      id: 'tpl_1',
      name: '模板1',
      columns: [],
      rows: [],
      filterField: '',
      titleFields: [],
      rules: [],
    };
    store.createTemplateLocal(tpl);
    store.createTemplateLocal({ ...tpl, name: '模板1更新' });
    expect(store.tpls.length).toBe(1);
    expect(store.tpls[0].name).toBe('模板1更新');
  });

  it('updateConnStatus 更新连接状态', () => {
    const store = useDataStore();
    store.updateConnStatus('ok');
    expect(store.connectionStatus).toBe('ok');
    expect(store.serverConnected).toBe(true);

    store.updateConnStatus('err');
    expect(store.connectionStatus).toBe('err');
    expect(store.serverConnected).toBe(false);

    store.updateConnStatus('loading');
    expect(store.connectionStatus).toBe('loading');
    expect(store.serverConnected).toBe(false);
  });
});
