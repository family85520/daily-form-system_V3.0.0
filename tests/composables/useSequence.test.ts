import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSequence, clearCache } from '@/composables/useSequence';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';

function makeTpl(rows: Record<string, string>[] = []): Template {
  return {
    id: 'tpl_seq',
    name: '序列测试',
    columns: [
      { id: 'c0', header: '序号', type: 'sequence', required: false, isEditable: true, included: true, uniqueValues: [] },
      { id: 'c1', header: '名称', type: 'text', required: false, isEditable: true, included: true, uniqueValues: [] },
    ],
    rows,
    filterField: '',
    titleFields: [],
    rules: [],
  };
}

describe('useSequence', () => {
  let dataStore: ReturnType<typeof useDataStore>;
  let sequence: ReturnType<typeof useSequence>;

  beforeEach(() => {
    setActivePinia(createPinia());
    clearCache(''); // 清除序列缓存，避免跨测试用例污染
    dataStore = useDataStore();
    sequence = useSequence();
  });

  it('无基础数据无提交时返回 1', () => {
    const tpl = makeTpl([]);
    expect(sequence.getNextSeqValue(tpl, '序号')).toBe('1');
  });

  it('基础数据有最大值 5 时返回 6', () => {
    const tpl = makeTpl([
      { '序号': '1', '名称': 'A' },
      { '序号': '3', '名称': 'B' },
      { '序号': '5', '名称': 'C' },
    ]);
    expect(sequence.getNextSeqValue(tpl, '序号')).toBe('6');
  });

  it('提交数据有更大值时返回更大值+1', () => {
    const tpl = makeTpl([
      { '序号': '1', '名称': 'A' },
    ]);
    dataStore.sub['tpl_seq'] = {
      '2024-01-01': {
        'user1': {
          '0': { '序号': '10', '名称': 'X' },
        },
      },
    };
    expect(sequence.getNextSeqValue(tpl, '序号')).toBe('11');
  });

  it('跳过非数字值', () => {
    const tpl = makeTpl([
      { '序号': 'abc', '名称': 'A' },
      { '序号': '5', '名称': 'B' },
    ]);
    expect(sequence.getNextSeqValue(tpl, '序号')).toBe('6');
  });

  it('跳过空值', () => {
    const tpl = makeTpl([
      { '序号': '', '名称': 'A' },
      { '序号': '3', '名称': 'B' },
    ]);
    expect(sequence.getNextSeqValue(tpl, '序号')).toBe('4');
  });

  it('无模板行时返回 1', () => {
    const tpl = makeTpl(undefined as unknown as Record<string, string>[]);
    tpl.rows = undefined as unknown as Record<string, string>[];
    expect(sequence.getNextSeqValue(tpl, '序号')).toBe('1');
  });
});
