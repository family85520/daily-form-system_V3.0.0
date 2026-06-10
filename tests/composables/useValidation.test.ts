import { describe, it, expect } from 'vitest';
import { useValidation } from '@/composables/useValidation';
import type { Column, Template, FieldRule } from '@/types';

const {
  validateField,
  compareValues,
  evaluateCondition,
  applyCopyRules,
  validateAllRules,
  validateAndApplyRules,
  getOperatorLabel,
  getActionLabel,
  getRuleDesc,
} = useValidation();

// ===== 辅助函数 =====
function makeCol(overrides: Partial<Column> = {}): Column {
  return {
    id: 'c1',
    header: '测试字段',
    type: 'text',
    required: false,
    isEditable: true,
    included: true,
    uniqueValues: [],
    ...overrides,
  };
}

function makeTpl(rules: FieldRule[] = [], columns?: Column[]): Template {
  return {
    id: 'tpl_test',
    name: '测试模板',
    columns: columns || [
      makeCol({ id: 'c1', header: '姓名', type: 'text', required: true }),
      makeCol({ id: 'c2', header: '数量', type: 'number' }),
      makeCol({ id: 'c3', header: '状态', type: 'select', uniqueValues: ['进行中', '已完成'] }),
      makeCol({ id: 'c4', header: '日期', type: 'date' }),
      makeCol({ id: 'c5', header: '备注', type: 'textarea' }),
    ],
    rows: [],
    filterField: '',
    titleFields: [],
    rules,
  };
}

// ===== validateField 测试 =====
describe('validateField', () => {
  it('必填字段为空时返回错误', () => {
    const col = makeCol({ required: true });
    const errors = validateField(col, '');
    expect(errors).toContain('为必填项');
  });

  it('必填字段有值时不返回必填错误', () => {
    const col = makeCol({ required: true });
    const errors = validateField(col, '张三');
    expect(errors).not.toContain('为必填项');
  });

  it('非必填字段为空时不返回错误', () => {
    const col = makeCol({ required: false });
    const errors = validateField(col, '');
    expect(errors).toHaveLength(0);
  });

  it('数字字段输入非数字时返回错误', () => {
    const col = makeCol({ type: 'number' });
    const errors = validateField(col, 'abc');
    expect(errors).toContain('必须为数字');
  });

  it('数字字段输入有效数字不返回错误', () => {
    const col = makeCol({ type: 'number' });
    const errors = validateField(col, '42');
    expect(errors).toHaveLength(0);
  });

  it('数字字段小于最小值时返回错误', () => {
    const col = makeCol({ type: 'number', constraints: { min: 10 } });
    const errors = validateField(col, '5');
    expect(errors).toContain('不能小于 10');
  });

  it('数字字段大于最大值时返回错误', () => {
    const col = makeCol({ type: 'number', constraints: { max: 100 } });
    const errors = validateField(col, '150');
    expect(errors).toContain('不能大于 100');
  });

  it('日期字段格式错误时返回错误', () => {
    const col = makeCol({ type: 'date' });
    const errors = validateField(col, '2024/01/01');
    expect(errors).toContain('日期格式应为 YYYY-MM-DD');
  });

  it('日期字段格式正确时不返回错误', () => {
    const col = makeCol({ type: 'date' });
    const errors = validateField(col, '2024-01-01');
    expect(errors).toHaveLength(0);
  });

  it('文本字段长度不足时返回错误', () => {
    const col = makeCol({ type: 'text', constraints: { minLength: 3 } });
    const errors = validateField(col, 'ab');
    expect(errors).toContain('长度不能少于 3 个字符');
  });

  it('文本字段长度超限时返回错误', () => {
    const col = makeCol({ type: 'text', constraints: { maxLength: 5 } });
    const errors = validateField(col, 'abcdef');
    expect(errors).toContain('长度不能超过 5 个字符');
  });

  it('下拉字段选择无效值时返回错误', () => {
    const col = makeCol({ type: 'select', uniqueValues: ['选项A', '选项B'] });
    const errors = validateField(col, '选项C');
    expect(errors).toContain('值不在可选范围内');
  });

  it('下拉字段选择有效值时不返回错误', () => {
    const col = makeCol({ type: 'select', uniqueValues: ['选项A', '选项B'] });
    const errors = validateField(col, '选项A');
    expect(errors).toHaveLength(0);
  });

  it('正则校验失败时返回错误', () => {
    const col = makeCol({ constraints: { pattern: '^\\d{6}$', errorMessage: '请输入6位数字' } });
    const errors = validateField(col, '12345');
    expect(errors).toContain('请输入6位数字');
  });

  it('正则校验通过时不返回错误', () => {
    const col = makeCol({ constraints: { pattern: '^\\d{6}$' } });
    const errors = validateField(col, '123456');
    expect(errors).toHaveLength(0);
  });
});

// ===== compareValues 测试 =====
describe('compareValues', () => {
  it('equals: 相等返回 true', () => {
    expect(compareValues('abc', 'equals', 'abc')).toBe(true);
  });

  it('equals: 不等返回 false', () => {
    expect(compareValues('abc', 'equals', 'def')).toBe(false);
  });

  it('equals: 多值用 | 分隔', () => {
    expect(compareValues('abc', 'equals', 'abc|def')).toBe(true);
    expect(compareValues('xyz', 'equals', 'abc|def')).toBe(false);
  });

  it('equals: 数字比较', () => {
    expect(compareValues('10', 'equals', '10')).toBe(true);
    expect(compareValues('10.0', 'equals', '10')).toBe(true);
  });

  it('not_equals: 不等返回 true', () => {
    expect(compareValues('abc', 'not_equals', 'def')).toBe(true);
  });

  it('not_equals: 相等返回 false', () => {
    expect(compareValues('abc', 'not_equals', 'abc')).toBe(false);
  });

  it('greater_than: 数字比较', () => {
    expect(compareValues('10', 'greater_than', '5')).toBe(true);
    expect(compareValues('5', 'greater_than', '10')).toBe(false);
    expect(compareValues('10', 'greater_than', '10')).toBe(false);
  });

  it('less_than: 数字比较', () => {
    expect(compareValues('5', 'less_than', '10')).toBe(true);
    expect(compareValues('10', 'less_than', '5')).toBe(false);
  });

  it('greater_equal: 数字比较', () => {
    expect(compareValues('10', 'greater_equal', '10')).toBe(true);
    expect(compareValues('11', 'greater_equal', '10')).toBe(true);
    expect(compareValues('9', 'greater_equal', '10')).toBe(false);
  });

  it('less_equal: 数字比较', () => {
    expect(compareValues('10', 'less_equal', '10')).toBe(true);
    expect(compareValues('9', 'less_equal', '10')).toBe(true);
    expect(compareValues('11', 'less_equal', '10')).toBe(false);
  });

  it('between: 范围内返回 true', () => {
    expect(compareValues('5', 'between', '1|10')).toBe(true);
    expect(compareValues('1', 'between', '1|10')).toBe(true);
    expect(compareValues('10', 'between', '1|10')).toBe(true);
    expect(compareValues('0', 'between', '1|10')).toBe(false);
    expect(compareValues('11', 'between', '1|10')).toBe(false);
  });

  it('between: 反转范围也能工作', () => {
    expect(compareValues('5', 'between', '10|1')).toBe(true);
  });

  it('contains: 包含返回 true', () => {
    expect(compareValues('hello world', 'contains', 'world')).toBe(true);
    expect(compareValues('hello', 'contains', 'world')).toBe(false);
  });

  it('contains: 多值用 | 分隔', () => {
    expect(compareValues('hello world', 'contains', 'foo|world')).toBe(true);
    expect(compareValues('hello', 'contains', 'foo|bar')).toBe(false);
  });

  it('not_contains: 不包含返回 true', () => {
    expect(compareValues('hello', 'not_contains', 'world')).toBe(true);
    expect(compareValues('hello world', 'not_contains', 'world')).toBe(false);
  });

  it('is_empty: 空字符串返回 true', () => {
    expect(compareValues('', 'is_empty', '')).toBe(true);
    expect(compareValues('abc', 'is_empty', '')).toBe(false);
  });

  it('is_not_empty: 非空返回 true', () => {
    expect(compareValues('abc', 'is_not_empty', '')).toBe(true);
    expect(compareValues('', 'is_not_empty', '')).toBe(false);
  });

  it('非数字字段比较返回 false', () => {
    expect(compareValues('abc', 'greater_than', '5')).toBe(false);
    expect(compareValues('abc', 'less_than', '5')).toBe(false);
  });

  it('空值比较返回 false（除 is_empty 外）', () => {
    expect(compareValues('', 'greater_than', '5')).toBe(false);
    expect(compareValues('', 'less_than', '5')).toBe(false);
  });
});

// ===== evaluateCondition 测试 =====
describe('evaluateCondition', () => {
  it('条件评估正确', () => {
    const data = { status: '已完成', count: '10' };
    expect(evaluateCondition({ field: 'status', operator: 'equals', value: '已完成', valueType: 'value' }, data)).toBe(true);
    expect(evaluateCondition({ field: 'status', operator: 'equals', value: '进行中', valueType: 'value' }, data)).toBe(false);
  });

  it('字段引用比较', () => {
    const data = { field_a: '10', field_b: '10' };
    expect(evaluateCondition({ field: 'field_a', operator: 'equals', value: 'field_b', valueType: 'field' }, data)).toBe(true);
  });
});

// ===== applyCopyRules 测试 =====
describe('applyCopyRules', () => {
  it('条件满足且目标为空时执行复制', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'copy', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const data = { status: '已完成', result: '' };
    applyCopyRules(tpl, data);
    expect(data.result).toBe('已完成');
  });

  it('条件不满足时不执行复制', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'copy', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const data = { status: '进行中', result: '' };
    applyCopyRules(tpl, data);
    expect(data.result).toBe('');
  });

  it('目标已有值时不覆盖', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'copy', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const data = { status: '已完成', result: '已有值' };
    applyCopyRules(tpl, data);
    expect(data.result).toBe('已有值');
  });

  it('禁用的规则不执行', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'copy', target: 'result' },
      disabled: true,
    }];
    const tpl = makeTpl(rules);
    const data = { status: '已完成', result: '' };
    applyCopyRules(tpl, data);
    expect(data.result).toBe('');
  });
});

// ===== validateAllRules 测试 =====
describe('validateAllRules', () => {
  it('require 规则：条件满足但目标为空时返回错误', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'require', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const errors = validateAllRules(tpl, { status: '已完成', result: '' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('必须填写');
  });

  it('require 规则：条件满足且目标有值时不返回错误', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'require', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const errors = validateAllRules(tpl, { status: '已完成', result: '已填写' });
    expect(errors).toHaveLength(0);
  });

  it('forbid 规则：条件满足但目标有值时返回错误', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '未开始', valueType: 'value' },
      action: { type: 'forbid', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const errors = validateAllRules(tpl, { status: '未开始', result: '有值' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('必须为空');
  });

  it('forbid 规则：条件满足且目标为空时不返回错误', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '未开始', valueType: 'value' },
      action: { type: 'forbid', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const errors = validateAllRules(tpl, { status: '未开始', result: '' });
    expect(errors).toHaveLength(0);
  });

  it('条件不满足时规则不触发', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'require', target: 'result' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const errors = validateAllRules(tpl, { status: '进行中', result: '' });
    expect(errors).toHaveLength(0);
  });

  it('禁用的规则不触发', () => {
    const rules: FieldRule[] = [{
      condition: { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'require', target: 'result' },
      disabled: true,
    }];
    const tpl = makeTpl(rules);
    const errors = validateAllRules(tpl, { status: '已完成', result: '' });
    expect(errors).toHaveLength(0);
  });

  it('空规则列表不返回错误', () => {
    const tpl = makeTpl([]);
    const errors = validateAllRules(tpl, { status: '已完成' });
    expect(errors).toHaveLength(0);
  });
});

// ===== validateAndApplyRules 测试 =====
describe('validateAndApplyRules', () => {
  it('必填字段为空时返回字段校验错误', () => {
    const tpl = makeTpl([]);
    const cols = tpl.columns;
    const data: Record<string, string> = { '姓名': '', '数量': '10', '状态': '进行中', '日期': '2024-01-01', '备注': '' };
    const errors = validateAndApplyRules(tpl, 0, data, cols, '', '');
    expect(errors.some(e => e.includes('为必填项'))).toBe(true);
  });

  it('所有字段有效时不返回错误', () => {
    const tpl = makeTpl([]);
    const cols = tpl.columns;
    const data: Record<string, string> = { '姓名': '张三', '数量': '10', '状态': '进行中', '日期': '2024-01-01', '备注': '测试' };
    const errors = validateAndApplyRules(tpl, 0, data, cols, '', '');
    expect(errors).toHaveLength(0);
  });

  it('跳过筛选字段的校验', () => {
    const tpl = makeTpl([], [
      makeCol({ id: 'c1', header: '姓名', type: 'text', required: true }),
      makeCol({ id: 'c2', header: '数量', type: 'number' }),
    ]);
    tpl.filterField = '姓名';
    const data: Record<string, string> = { '姓名': '', '数量': '10' };
    const errors = validateAndApplyRules(tpl, 0, data, tpl.columns, '姓名', '张三');
    expect(errors.some(e => e.includes('姓名'))).toBe(false);
  });

  it('跳过 sequence 类型字段的校验', () => {
    const tpl = makeTpl([], [
      makeCol({ id: 'c1', header: '序号', type: 'sequence', required: true }),
      makeCol({ id: 'c2', header: '数量', type: 'number' }),
    ]);
    const data: Record<string, string> = { '序号': '', '数量': '10' };
    const errors = validateAndApplyRules(tpl, 0, data, tpl.columns, '', '');
    expect(errors.some(e => e.includes('序号'))).toBe(false);
  });

  it('规则引擎和字段校验同时生效', () => {
    const rules: FieldRule[] = [{
      condition: { field: '状态', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'require', target: '备注' },
      disabled: false,
    }];
    const tpl = makeTpl(rules);
    const data: Record<string, string> = { '姓名': '张三', '数量': '10', '状态': '已完成', '日期': '2024-01-01', '备注': '' };
    const errors = validateAndApplyRules(tpl, 0, data, tpl.columns, '', '');
    expect(errors.some(e => e.includes('备注') && e.includes('必须填写'))).toBe(true);
  });
});

// ===== getOperatorLabel / getActionLabel 测试 =====
describe('标签函数', () => {
  it('getOperatorLabel 返回中文标签', () => {
    expect(getOperatorLabel('equals')).toBe('等于');
    expect(getOperatorLabel('greater_than')).toBe('大于');
    expect(getOperatorLabel('is_empty')).toBe('为空');
    expect(getOperatorLabel('between')).toBe('介于');
  });

  it('getActionLabel 返回中文标签', () => {
    expect(getActionLabel('require')).toBe('必须填写');
    expect(getActionLabel('forbid')).toBe('必须为空');
    expect(getActionLabel('copy')).toBe('自动复制');
    expect(getActionLabel('equals')).toBe('等于');
  });
});

// ===== getRuleDesc 测试 =====
describe('getRuleDesc', () => {
  it('生成 require 规则描述', () => {
    const rule: FieldRule = {
      condition: { field: '状态', operator: 'equals', value: '已完成', valueType: 'value' },
      action: { type: 'require', target: '备注' },
      disabled: false,
    };
    const desc = getRuleDesc(rule);
    expect(desc).toContain('状态');
    expect(desc).toContain('等于');
    expect(desc).toContain('已完成');
    expect(desc).toContain('备注');
    expect(desc).toContain('必须填写');
  });

  it('生成 copy 规则描述', () => {
    const rule: FieldRule = {
      condition: { field: '状态', operator: 'is_not_empty', value: '', valueType: 'value' },
      action: { type: 'copy', target: '结果' },
      disabled: false,
    };
    const desc = getRuleDesc(rule);
    expect(desc).toContain('自动赋值');
    expect(desc).toContain('结果');
  });
});
