import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import naive from 'naive-ui';
import RecordCard from '@/components/fill/RecordCard.vue';
import type { Template } from '@/types';

const baseTemplate: Template = {
  id: 'tpl_1',
  name: '测试模板',
  columns: [
    { header: '姓名', type: 'text', required: true, isEditable: true, included: true },
    { header: '数量', type: 'number', required: false, isEditable: true, included: true },
    { header: '日期', type: 'date', required: false, isEditable: true, included: true },
  ],
  rows: [
    { 姓名: '项目A', 数量: '10', 日期: '2024-01-01' },
  ],
  filterField: '',
  titleFields: ['姓名'],
  rules: [],
};

describe('RecordCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('渲染卡片标题', () => {
    const wrapper = mount(RecordCard, {
      global: {
        plugins: [naive],
      },
      props: {
        template: baseTemplate,
        rowIndex: 0,
        row: baseTemplate.rows[0],
        currentUser: '张三',
        currentDate: '2024-01-01',
        userData: {},
        effectiveValues: [],
        forceExpand: false,
      },
    });
    expect(wrapper.text()).toContain('项目A');
  });

  it('显示进度信息', () => {
    const wrapper = mount(RecordCard, {
      global: {
        plugins: [naive],
      },
      props: {
        template: baseTemplate,
        rowIndex: 0,
        row: baseTemplate.rows[0],
        currentUser: '张三',
        currentDate: '2024-01-01',
        userData: {},
        effectiveValues: [],
        forceExpand: false,
      },
    });
    expect(wrapper.text()).toContain('今日 0/3');
  });

  it('forceExpand=true 时 card 有 expanded 类', async () => {
    const wrapper = mount(RecordCard, {
      global: {
        plugins: [naive],
      },
      props: {
        template: baseTemplate,
        rowIndex: 0,
        row: baseTemplate.rows[0],
        currentUser: '张三',
        currentDate: '2024-01-01',
        userData: {},
        effectiveValues: [],
        forceExpand: false,
      },
    });

    // 初始不应展开
    expect(wrapper.find('.record-card.expanded').exists()).toBe(false);

    // 更新 prop 触发 watch
    await wrapper.setProps({ forceExpand: true });
    expect(wrapper.find('.record-card.expanded').exists()).toBe(true);

    // 再次更新折叠
    await wrapper.setProps({ forceExpand: false });
    expect(wrapper.find('.record-card.expanded').exists()).toBe(false);
  });

  it('全部字段已填时显示已完成状态标签', () => {
    const wrapper = mount(RecordCard, {
      global: {
        plugins: [naive],
      },
      props: {
        template: baseTemplate,
        rowIndex: 0,
        row: baseTemplate.rows[0],
        currentUser: '张三',
        currentDate: '2024-01-01',
        userData: { '0': { 姓名: '项目A', 数量: '10', 日期: '2024-01-01' } },
        effectiveValues: [
          { 姓名: { val: '项目A', src: 'today' }, 数量: { val: '10', src: 'today' }, 日期: { val: '2024-01-01', src: 'today' } },
        ],
        forceExpand: false,
      },
    });
    expect(wrapper.text()).toContain('已完成');
  });

  it('触发快速填写事件', async () => {
    const wrapper = mount(RecordCard, {
      global: {
        plugins: [naive],
      },
      props: {
        template: baseTemplate,
        rowIndex: 0,
        row: baseTemplate.rows[0],
        currentUser: '张三',
        currentDate: '2024-01-01',
        userData: {},
        effectiveValues: [],
        forceExpand: false,
      },
    });

    const quickFillBtn = wrapper.findAll('button').find(btn => btn.text().includes('快速填写'));
    expect(quickFillBtn).toBeDefined();
    if (quickFillBtn) {
      await quickFillBtn.trigger('click');
      expect(wrapper.emitted('open-quick-fill')).toBeTruthy();
      expect(wrapper.emitted('open-quick-fill')![0]).toEqual([0]);
    }
  });
});
