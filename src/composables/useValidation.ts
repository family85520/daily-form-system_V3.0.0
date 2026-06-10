import type {
  Column,
  FieldRule,
  Template,
  RuleOperator,
  RuleActionType,
  ValueSourceType,
} from '@/types';

/**
 * 字段校验 + 规则引擎
 *
 * 包含：
 *   - validateField: 单字段校验
 *   - compareValues: 比较运算
 *   - evaluateCondition: 条件评估
 *   - applyCopyRules: 执行 copy 规则（纯数据层，不依赖 DOM）
 *   - validateAllRules: 规则校验
 *   - validateAndApplyRules: 统一校验入口
 *   - getOperatorLabel / getActionLabel / getRuleDesc: 规则描述生成
 */
export function useValidation() {

  // ===== 单字段校验（对应原 validateField） =====
  function validateField(col: Column, value: string): string[] {
    const errors: string[] = [];
    const val = (value || '').trim();

    // 必填校验
    if (col.required && !val) {
      errors.push('为必填项');
      return errors;
    }
    if (!val) return errors;

    const con = col.constraints || {};

    // 数字类型校验
    if (col.type === 'number') {
      if (isNaN(Number(val))) {
        errors.push('必须为数字');
        return errors;
      }
      const numVal = Number(val);
      if (con.min !== undefined && con.min !== null && numVal < con.min) {
        errors.push('不能小于 ' + con.min);
      }
      if (con.max !== undefined && con.max !== null && numVal > con.max) {
        errors.push('不能大于 ' + con.max);
      }
    }

    // 日期格式校验（兼容 YYYY-MM-DD 和 YYYY/MM/DD，忽略非日期占位文本）
    if (col.type === 'date') {
      const normalized = val.replace(/\//g, '-');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        // 仅当值以4位数字年份开头时才报格式错误，避免占位符文本（如 "yyyy/mm/日"）误触发
        if (/^\d{4}/.test(normalized)) {
          errors.push('日期格式应为 YYYY-MM-DD');
        }
      }
    }

    // 文本长度校验
    if (col.type === 'text' || col.type === 'textarea') {
      if (con.minLength && val.length < con.minLength) {
        errors.push('长度不能少于 ' + con.minLength + ' 个字符');
      }
      if (con.maxLength && val.length > con.maxLength) {
        errors.push('长度不能超过 ' + con.maxLength + ' 个字符');
      }
    }

    // 下拉选项校验
    if (col.type === 'select' && col.uniqueValues && col.uniqueValues.length) {
      if (!col.uniqueValues.includes(val)) {
        errors.push('值不在可选范围内');
      }
    }

    // 正则校验
    if (con.pattern) {
      try {
        const regex = new RegExp(con.pattern);
        if (!regex.test(val)) {
          errors.push(con.errorMessage || '格式不正确');
        }
      } catch (_e) {
        // 正则表达式无效时跳过
      }
    }

    return errors;
  }

  // ===== 比较运算（对应原 compareValues） =====
  function compareValues(val: string, operator: RuleOperator, cmpVal: string): boolean {
    val = (val || '').trim();
    cmpVal = (cmpVal || '').trim();

    switch (operator) {
      case 'is_empty':
        return val === '';
      case 'is_not_empty':
        return val !== '';
      case 'equals': {
        if (!cmpVal) return val === '';
        const opts = cmpVal.split('|').map(s => s.trim()).filter(Boolean);
        const nVal = parseFloat(val);
        if (!isNaN(nVal)) {
          return opts.some(opt => {
            const nOpt = parseFloat(opt);
            return !isNaN(nOpt) ? nVal === nOpt : val === opt;
          });
        }
        return opts.indexOf(val) >= 0;
      }
      case 'not_equals': {
        if (!cmpVal) return val !== '';
        const opts = cmpVal.split('|').map(s => s.trim()).filter(Boolean);
        const nVal = parseFloat(val);
        if (!isNaN(nVal)) {
          return opts.every(opt => {
            const nOpt = parseFloat(opt);
            return !isNaN(nOpt) ? nVal !== nOpt : val !== opt;
          });
        }
        return opts.indexOf(val) < 0;
      }
      case 'greater_than': {
        if (val === '') return false;
        const n1 = parseFloat(val), n2 = parseFloat(cmpVal);
        if (isNaN(n1) || isNaN(n2)) return false;
        return n1 > n2;
      }
      case 'less_than': {
        if (val === '') return false;
        const n3 = parseFloat(val), n4 = parseFloat(cmpVal);
        if (isNaN(n3) || isNaN(n4)) return false;
        return n3 < n4;
      }
      case 'greater_equal': {
        if (val === '') return false;
        const n5 = parseFloat(val), n6 = parseFloat(cmpVal);
        if (isNaN(n5) || isNaN(n6)) return false;
        return n5 >= n6;
      }
      case 'less_equal': {
        if (val === '') return false;
        const n7 = parseFloat(val), n8 = parseFloat(cmpVal);
        if (isNaN(n7) || isNaN(n8)) return false;
        return n7 <= n8;
      }
      case 'between': {
        if (val === '') return false;
        const n = parseFloat(val);
        if (isNaN(n)) return false;
        const parts = cmpVal.split('|').map(s => parseFloat(s.trim()));
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
        return n >= Math.min(parts[0], parts[1]) && n <= Math.max(parts[0], parts[1]);
      }
      case 'contains': {
        if (!cmpVal) return false;
        const opts = cmpVal.split('|').map(s => s.trim()).filter(Boolean);
        return opts.some(opt => val.indexOf(opt) >= 0);
      }
      case 'not_contains': {
        if (!cmpVal) return true;
        const opts = cmpVal.split('|').map(s => s.trim()).filter(Boolean);
        return opts.every(opt => val.indexOf(opt) < 0);
      }
      default:
        return false;
    }
  }

  // ===== 获取解析后的值（字段引用或固定值） =====
  function getResolvedValue(valOrField: string, valueType: ValueSourceType, data: Record<string, string>): string {
    if (valueType === 'field') return (data[valOrField] || '').trim();
    return (valOrField || '').trim();
  }

  // ===== 条件评估（对应原 evaluateCondition） =====
  function evaluateCondition(cond: { field: string; operator: RuleOperator; value: string; valueType: ValueSourceType }, data: Record<string, string>): boolean {
    const srcVal = (data[cond.field] || '').trim();
    const cmpVal = getResolvedValue(cond.value, cond.valueType, data);
    return compareValues(srcVal, cond.operator, cmpVal);
  }

  // ===== 执行 copy 规则（纯数据层，不依赖 DOM） =====
  // 对应原 applyCopyRules()
  function applyCopyRules(tpl: Template, data: Record<string, string>): void {
    const rules = tpl.rules || [];
    if (!rules.length) return;

    rules.forEach(rule => {
      if (rule.disabled === true) return;
      const action = rule.action || {};
      if (action.type !== 'copy') return;

      const cond = rule.condition || {};
      if (!evaluateCondition(cond, data)) return;

      const srcVal = (data[cond.field] || '').trim();
      const tgtVal = (data[action.target] || '').trim();

      // 源有值且目标为空时，执行赋值
      if (srcVal && !tgtVal) {
        data[action.target] = srcVal;
      }
    });
  }

  // ===== 规则校验（对应原 validateAllRules） =====
  function validateAllRules(tpl: Template, data: Record<string, string>): string[] {
    const rules = tpl.rules || [];
    if (!rules.length) return [];
    const errors: string[] = [];

    const compareTypes: RuleActionType[] = [
      'equals', 'not_equals', 'greater_than', 'less_than',
      'greater_equal', 'less_equal', 'between', 'contains', 'not_contains'
    ];

    rules.forEach(rule => {
      if (rule.disabled === true) return;

      const cond = rule.condition || {};
      const action = rule.action || {};

      if (!evaluateCondition(cond, data)) return;

      const tgtVal = (data[action.target] || '').trim();

      if (action.type === 'require') {
        if (tgtVal === '') {
          errors.push(
            '当「' + (cond.field || '?') + '」' + getOperatorLabel(cond.operator) +
            (getValueLabel(cond) ? ' ' + getValueLabel(cond) : '') +
            '时，「' + (action.target || '?') + '」必须填写'
          );
        }
      } else if (action.type === 'forbid') {
        if (tgtVal !== '') {
          errors.push(
            '当「' + (cond.field || '?') + '」' + getOperatorLabel(cond.operator) +
            (getValueLabel(cond) ? ' ' + getValueLabel(cond) : '') +
            '时，「' + (action.target || '?') + '」必须为空'
          );
        }
      } else if (action.type === 'validate_match') {
        const expectedMatch = getResolvedValue(action.value || '', action.valueType || 'value', data);
        if (tgtVal !== '' && tgtVal !== expectedMatch) {
          errors.push('「' + (action.target || '?') + '」应与「' + (cond.field || '?') + '」的值一致');
        }
      } else if (action.type === 'copy') {
        const srcVal = (data[cond.field] || '').trim();
        if (srcVal && tgtVal && srcVal !== tgtVal) {
          errors.push('「' + (action.target || '?') + '」已自动复制自「' + (cond.field || '?') + '」，当前值不匹配');
        }
      } else if (compareTypes.indexOf(action.type) >= 0) {
        const expectedCmp = getResolvedValue(action.value || '', action.valueType || 'value', data);

        if (tgtVal === '') {
          errors.push(
            '当「' + (cond.field || '?') + '」' + getOperatorLabel(cond.operator) +
            (getValueLabel(cond) ? ' ' + getValueLabel(cond) : '') +
            '时，「' + (action.target || '?') + '」必须填写'
          );
          return;
        }

        const numOps = ['greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'];
        if (numOps.indexOf(action.type) >= 0) {
          const tgtNum = parseFloat(tgtVal);
          if (isNaN(tgtNum)) {
            errors.push('「' + (action.target || '?') + '」必须为有效数字');
            return;
          }
        }

        if (!compareValues(tgtVal, action.type as RuleOperator, expectedCmp)) {
          const actionValLabel = action.valueType === 'field'
            ? '「' + (action.value || '?') + '」的值'
            : '「' + (action.value || '?') + '」';
          errors.push(
            '「' + (action.target || '?') + '」需' + getActionLabel(action.type) + ' ' + actionValLabel
            + '，当前值为「' + tgtVal + '」'
          );
        }
      }
    });

    return errors;
  }

  // ===== 统一校验入口（对应原 validateAndApplyRules） =====
  function validateAndApplyRules(
    tpl: Template,
    _ri: number,
    data: Record<string, string>,
    allCols: Column[],
    ff: string,
    _user: string,
    lineNum?: number
  ): string[] {
    // ===== 调试日志：打印当前校验数据 =====
    //console.groupCollapsed('[校验调试] ri=' + _ri + ' tpl=' + (tpl.name || tpl.id));
    //console.log('校验数据 data:', JSON.parse(JSON.stringify(data)));
    // 打印所有日期字段的值及其类型
    //allCols.forEach(c => {
    //  if (c.type === 'date') {
    //    const v = data[c.header];
    //    console.log(`  日期字段「${c.header}」=`, JSON.stringify(v), `类型=${typeof v} 长度=${(v||'').length}`);
    //  }
    //});
    // 打印 forbid 规则涉及的字段值
    //const rules = tpl.rules || [];
    //rules.forEach((rule, i) => {
    //  if (rule.disabled) return;
    //  const tgt = rule.action?.target;
    //  if (tgt) {
    //    const v = data[tgt];
    //    console.log(`  规则${i} 目标字段「${tgt}」=`, JSON.stringify(v), `类型=${typeof v}`);
    //  }
    //});
    //console.groupEnd();
    // ===== 调试日志结束 =====

    // ===== 校验前统一标准化日期字段 =====
    allCols.forEach(c => {
      if (c.type === 'date' && data[c.header] !== undefined) {
        const raw = data[c.header];
        if (!raw) return;
        const n = raw.replace(/\//g, '-');
        // "待定"、"yyyy/mm/日" 等非合法日期值 → 视为空
        data[c.header] = /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : '';
      }
    });
    // ===== 标准化结束 =====
    // console.log('[标准化后]', JSON.parse(JSON.stringify(data)));

    applyCopyRules(tpl, data);
    const errors: string[] = [];
    const prefix = lineNum ? ('第 ' + lineNum + ' 行：') : '';
    allCols.forEach(c => {
      if (ff && c.header === ff) return;
      if (c.type === 'sequence') return;
      const fieldErrors = validateField(c, data[c.header] || '');
      fieldErrors.forEach(reason => {
        errors.push(prefix + '「' + c.header + '」' + reason);
      });
    });
    const ruleErrors = validateAllRules(tpl, data);
    return errors.concat(ruleErrors);
  }

  // ===== 操作符标签 =====
  function getOperatorLabel(op: RuleOperator): string {
    const map: Record<string, string> = {
      'equals': '等于', 'not_equals': '不等于',
      'greater_than': '大于', 'less_than': '小于',
      'greater_equal': '大于等于', 'less_equal': '小于等于',
      'between': '介于', 'contains': '包含', 'not_contains': '不包含',
      'is_empty': '为空', 'is_not_empty': '不为空'
    };
    return map[op] || op;
  }

  // ===== 条件值标签 =====
  function getValueLabel(cond: { valueType?: ValueSourceType; value?: string; operator?: RuleOperator }): string {
    if (!cond) return '';
    if (cond.valueType === 'field') return '「' + (cond.value || '') + '」的值';
    if (cond.operator === 'is_empty' || cond.operator === 'is_not_empty') return '';
    return '「' + (cond.value || '') + '」';
  }

  // ===== 动作类型标签 =====
  function getActionLabel(type: RuleActionType): string {
    const map: Record<string, string> = {
      'require': '必须填写',
      'forbid': '必须为空',
      'copy': '自动复制',
      'validate_match': '值匹配校验',
      'equals': '等于',
      'not_equals': '不等于',
      'greater_than': '大于',
      'less_than': '小于',
      'greater_equal': '大于等于',
      'less_equal': '小于等于',
      'between': '介于',
      'contains': '包含',
      'not_contains': '不包含'
    };
    return map[type] || type;
  }

  // ===== 规则描述生成（对应原 getRuleDesc） =====
  function getRuleDesc(rule: FieldRule): string {
    const cond = rule.condition || {} as FieldRule['condition'];
    const action = rule.action || {} as FieldRule['action'];
    let desc = '当「' + (cond.field || '?') + '」' + getOperatorLabel(cond.operator);
    const vl = getValueLabel(cond);
    if (vl) desc += ' ' + vl;

    switch (action.type) {
      case 'require':
        desc += ' 时，「' + (action.target || '?') + '」必须填写';
        break;
      case 'forbid':
        desc += ' 时，「' + (action.target || '?') + '」必须为空';
        break;
      case 'copy':
        desc += ' 时，自动赋值到「' + (action.target || '?') + '」';
        break;
      case 'validate_match': {
        const mvl = '「' + (action.value || '?') + '」';
        desc += ' 时，「' + (action.target || '?') + '」需与 ' + mvl + ' 匹配';
        break;
      }
      case 'equals':
      case 'not_equals':
      case 'greater_than':
      case 'less_than':
      case 'greater_equal':
      case 'less_equal':
      case 'between':
      case 'contains':
      case 'not_contains': {
        const avl = action.valueType === 'field'
          ? '「' + (action.value || '?') + '」的值'
          : '「' + (action.value || '?') + '」';
        desc += ' 时，「' + (action.target || '?') + '」需' + getActionLabel(action.type) + ' ' + avl;
        break;
      }
      default:
        desc += ' 时，' + (action.type || '未知操作');
    }
    return desc;
  }

  return {
    validateField,
    compareValues,
    evaluateCondition,
    applyCopyRules,
    validateAllRules,
    validateAndApplyRules,
    getOperatorLabel,
    getActionLabel,
    getRuleDesc,
    getValueLabel,
  };
}
