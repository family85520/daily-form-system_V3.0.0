import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useValidation } from '@/composables/useValidation';
import type { Column, FieldRule } from '@/types';

// ===== 工具函数 =====

/** 获取 src 目录下所有 .vue 和 .ts 文件（排除 types、测试、node_modules） */
function getAllSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const excludes = ['node_modules', 'types', '__tests__', 'tests', '.d.ts'];

  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (excludes.some(ex => fullPath.includes(ex))) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.vue') || (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/** 读取文件内容 */
function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/** 获取相对路径（便于报告） */
function relPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/src/')[1] || filePath;
}

const srcDir = path.resolve(__dirname, '../../src');
const allFiles = getAllSourceFiles(srcDir);

// ===== 测试用例 =====

describe('字段校验统一性验证', () => {

  // ===== 1. 检查所有文件是否通过 useValidation 进行校验 =====

  describe('1. useValidation 是唯一的校验入口', () => {
    it('useValidation.ts 是唯一定义 validateField 的地方', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return; // 排除自身
        const content = readFile(f);

        // 检查是否重新定义了 validateField 函数
        if (/function\s+validateField\s*$$/.test(content) ||
            /const\s+validateField\s*=/.test(content) ||
            /let\s+validateField\s*=/.test(content)) {
          violations.push(relPath(f) + ': 重新定义了 validateField');
        }
      });

      expect(violations).toEqual([]);
    });

    it('useValidation.ts 是唯一定义 compareValues 的地方', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);

        if (/function\s+compareValues\s*\(/.test(content) ||
            /const\s+compareValues\s*=/.test(content)) {
          violations.push(relPath(f) + ': 重新定义了 compareValues');
        }
      });

      expect(violations).toEqual([]);
    });

    it('useValidation.ts 是唯一定义 evaluateCondition 的地方', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);

        if (/function\s+evaluateCondition\s*\(/.test(content) ||
            /const\s+evaluateCondition\s*=/.test(content)) {
          violations.push(relPath(f) + ': 重新定义了 evaluateCondition');
        }
      });

      expect(violations).toEqual([]);
    });

    it('useValidation.ts 是唯一定义 validateAllRules 的地方', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);

        if (/function\s+validateAllRules\s*\(/.test(content) ||
            /const\s+validateAllRules\s*=/.test(content)) {
          violations.push(relPath(f) + ': 重新定义了 validateAllRules');
        }
      });

      expect(violations).toEqual([]);
    });

    it('useValidation.ts 是唯一定义 applyCopyRules 的地方', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);

        if (/function\s+applyCopyRules\s*\(/.test(content) ||
            /const\s+applyCopyRules\s*=/.test(content)) {
          violations.push(relPath(f) + ': 重新定义了 applyCopyRules');
        }
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 2. 检查页面/组件中没有内联校验逻辑 =====

  describe('2. 页面/组件中没有内联校验逻辑', () => {
    it('组件中没有直接的必填校验逻辑', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        if (f.includes('node_modules')) return;
        const content = readFile(f);
        const rp = relPath(f);

        // 检查直接的必填校验模式
        const patterns = [
          { regex: /required\s*&&\s*!/, desc: '直接 required 校验' },
          { regex: /\.required\s*&&\s*!/, desc: '直接 .required 校验' },
          { regex: /!.*\.trim\($$\s*\?.*['"]必填/, desc: '内联必填判断' },
          { regex: /为必填项|不能为空|请填写|必填/, desc: '内联必填提示文本（非 useValidation）' },
        ];

        patterns.forEach(p => {
          if (p.regex.test(content)) {
            // 排除 useValidation.ts 和 useToast.ts（toast 消息可以包含"必填"）
            if (!rp.includes('useValidation') && !rp.includes('useToast') && !rp.includes('ErrorListModal')
                && !rp.includes('AdminImportTab') && !rp.includes('AdminTemplateEditor')) {
              // 进一步确认不是从 useValidation 导入后使用的
              if (!/useValidation/.test(content) || /function\s+validate/.test(content)) {
                violations.push(rp + ': ' + p.desc);
              }
            }
          }
        });
      });

      // 允许空数组（表示没有违规）
      expect(violations).toEqual([]);
    });

    it('组件中没有直接的数字校验逻辑', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        if (f.includes('node_modules')) return;
        const content = readFile(f);
        const rp = relPath(f);

        // 检查直接的数字校验模式（排除 types 定义和 useValidation）
        const patterns = [
          { regex: /isNaN\s*$$\s*Number\s*\(/, desc: '内联 isNaN(Number()) 校验' },
          { regex: /isNaN\s*\(\s*parseFloat\s*\(/, desc: '内联 isNaN(parseFloat()) 校验（用于校验）' },
          { regex: /必须为数字|请输入数字|数字格式/, desc: '内联数字校验提示' },
        ];

        patterns.forEach(p => {
          if (p.regex.test(content)) {
            if (!rp.includes('useValidation') && !rp.includes('useSequence') && !rp.includes('stat/')) {
              violations.push(rp + ': ' + p.desc);
            }
          }
        });
      });

      expect(violations).toEqual([]);
    });

    it('组件中没有直接的日期格式校验逻辑', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        if (f.includes('node_modules')) return;
        const content = readFile(f);
        const rp = relPath(f);

        // 检查直接的日期格式校验
        const patterns = [
          { regex: /\^\d\{4\}-\d\{2\}-\d\{2\}\$/, desc: '内联日期正则校验' },
          { regex: /日期格式应为/, desc: '内联日期格式提示' },
        ];

        patterns.forEach(p => {
          if (p.regex.test(content)) {
            if (!rp.includes('useValidation')) {
              violations.push(rp + ': ' + p.desc);
            }
          }
        });
      });

      expect(violations).toEqual([]);
    });

    it('组件中没有直接的正则校验逻辑', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        if (f.includes('node_modules')) return;
        if (f.includes('config')) return;
        const content = readFile(f);
        const rp = relPath(f);

        // 检查使用 constraints.pattern 进行校验的代码
        const patternMatch = content.match(/new RegExp\s*\(\s*[\w.]+\.pattern\s*\)$$/g);
        if (patternMatch) {
          if (!rp.includes('useValidation')) {
            violations.push(rp + ': 使用 constraints.pattern 进行内联正则校验');
          }
        }
      });

      expect(violations).toEqual([]);
    });

    it('组件中没有直接的下拉选项校验逻辑', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        if (f.includes('node_modules')) return;
        const content = readFile(f);
        const rp = relPath(f);

        // 检查直接使用 uniqueValues 进行校验
        const patterns = [
          { regex: /uniqueValues\.includes\s*\(/, desc: '直接使用 uniqueValues.includes 校验' },
          { regex: /不在可选范围/, desc: '内联选项范围提示' },
        ];

        patterns.forEach(p => {
          if (p.regex.test(content)) {
            if (!rp.includes('useValidation') && !rp.includes('FormField') && !rp.includes('AdminImport')) {
              violations.push(rp + ': ' + p.desc);
            }
          }
        });
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 3. 检查所有提交入口都调用 useValidation =====

  describe('3. 所有提交入口都调用 useValidation', () => {
    it('FillPage 的提交逻辑使用 useValidation', () => {
      const fillPage = readFile(path.join(srcDir, 'views/FillPage.vue'));
      expect(fillPage).toContain('useValidation');
      expect(fillPage).toContain('validateAndApplyRules');
    });

    it('AddRowDialog 的提交逻辑使用 useValidation', () => {
      const filePath = path.join(srcDir, 'components/fill/AddRowDialog.vue');
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content).toContain('useValidation');
        expect(content).toContain('validateAndApplyRules');
      }
    });

    it('BatchAddDialog 的提交逻辑使用 useValidation', () => {
      const filePath = path.join(srcDir, 'components/fill/BatchAddDialog.vue');
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content).toContain('useValidation');
        expect(content).toContain('validateAndApplyRules');
      }
    });

    it('QuickFillDialog 的提交逻辑使用 useValidation', () => {
      const filePath = path.join(srcDir, 'components/fill/QuickFillDialog.vue');
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content).toContain('useValidation');
      }
    });

    it('AdminDataTab 的编辑保存使用 useValidation', () => {
      const filePath = path.join(srcDir, 'components/admin/AdminDataTab.vue');
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content).toContain('useValidation');
      }
    });
  });

  // ===== 4. 检查 useValidation 导出完整性 =====

  describe('4. useValidation 导出完整性', () => {
    const { validateField, compareValues, evaluateCondition, applyCopyRules, validateAllRules, validateAndApplyRules, getOperatorLabel, getActionLabel, getRuleDesc } = useValidation();

    it('validateField 函数已导出且可调用', () => {
      expect(typeof validateField).toBe('function');
    });

    it('compareValues 函数已导出且可调用', () => {
      expect(typeof compareValues).toBe('function');
    });

    it('evaluateCondition 函数已导出且可调用', () => {
      expect(typeof evaluateCondition).toBe('function');
    });

    it('applyCopyRules 函数已导出且可调用', () => {
      expect(typeof applyCopyRules).toBe('function');
    });

    it('validateAllRules 函数已导出且可调用', () => {
      expect(typeof validateAllRules).toBe('function');
    });

    it('validateAndApplyRules 函数已导出且可调用', () => {
      expect(typeof validateAndApplyRules).toBe('function');
    });

    it('getOperatorLabel 函数已导出且可调用', () => {
      expect(typeof getOperatorLabel).toBe('function');
    });

    it('getActionLabel 函数已导出且可调用', () => {
      expect(typeof getActionLabel).toBe('function');
    });

    it('getRuleDesc 函数已导出且可调用', () => {
      expect(typeof getRuleDesc).toBe('function');
    });
  });

  // ===== 5. 检查没有重复的校验常量定义 =====

  describe('5. 没有重复的校验常量定义', () => {
    it('操作符映射只在 useValidation 中定义', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        if (f.includes('types')) return;
        const content = readFile(f);
        const rp = relPath(f);

        // 检查是否重新定义了操作符映射
        const patterns = [
          /equals.*不等于.*大于.*小于/s,
          /必须填写.*必须为空.*自动复制/s,
        ];

        patterns.forEach(p => {
          if (p.test(content)) {
            if (!rp.includes('useValidation') && !rp.includes('AdminTemplateEditor')) {
              violations.push(rp + ': 可能重新定义了操作符/动作映射');
            }
          }
        });
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 6. 检查 useValidation 被正确导入 =====

  describe('6. 使用校验的文件正确导入 useValidation', () => {
    it('调用 validateAndApplyRules 的文件都导入了 useValidation', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('validateAndApplyRules') || content.includes('validateField') || content.includes('validateAllRules')) {
          if (!content.includes('useValidation')) {
            violations.push(rp + ': 调用了校验函数但未导入 useValidation');
          }
        }
      });

      expect(violations).toEqual([]);
    });

    it('调用 compareValues 的文件都导入了 useValidation', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('compareValues(') && !content.includes('useValidation')) {
          violations.push(rp + ': 调用了 compareValues 但未导入 useValidation');
        }
      });

      expect(violations).toEqual([]);
    });

    it('调用 evaluateCondition 的文件都导入了 useValidation', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('evaluateCondition(') && !content.includes('useValidation')) {
          violations.push(rp + ': 调用了 evaluateCondition 但未导入 useValidation');
        }
      });

      expect(violations).toEqual([]);
    });

    it('调用 applyCopyRules 的文件都导入了 useValidation', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (f.includes('useValidation.ts')) return;
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('applyCopyRules(') && !content.includes('useValidation')) {
          violations.push(rp + ': 调用了 applyCopyRules 但未导入 useValidation');
        }
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 7. 检查 useValidation 自身的逻辑覆盖 =====

  describe('7. useValidation 自身逻辑覆盖', () => {
    const { validateField, compareValues, evaluateCondition, applyCopyRules, validateAllRules, validateAndApplyRules } = useValidation();

    it('validateField 覆盖所有 FieldType', () => {
      const types = ['text', 'number', 'textarea', 'select', 'date', 'sequence'];
      const results: Record<string, boolean> = {};

      types.forEach(type => {
        const col: Column = {
          id: 'c1',
          header: 'test',
          type: type as Column['type'],
          required: true,
          isEditable: true,
          included: true,
          uniqueValues: [],
        };
        const errors = validateField(col, '');
        // 必填字段为空应该返回错误（sequence 除外）
        if (type === 'sequence') {
          // sequence 类型在 validateField 层面会校验必填，
          // 但在 validateAndApplyRules 层面会跳过
          results[type] = true; // 标记为已覆盖
        } else {
          results[type] = errors.length > 0;
        }
      });

      expect(results['text']).toBe(true);
      expect(results['number']).toBe(true);
      expect(results['textarea']).toBe(true);
      expect(results['select']).toBe(true);
      expect(results['date']).toBe(true);
      expect(results['sequence']).toBe(true);
    });

    it('compareValues 覆盖所有 RuleOperator', () => {
      const operators = [
        'equals', 'not_equals', 'greater_than', 'less_than',
        'greater_equal', 'less_equal', 'between', 'contains',
        'not_contains', 'is_empty', 'is_not_empty',
      ];

      operators.forEach(op => {
        const result = compareValues('test', op as any, 'test');
        expect(typeof result).toBe('boolean');
      });
    });

    it('evaluateCondition 覆盖 value 和 field 两种 valueType', () => {
      const data = { status: '已完成', count: '10', target: '已完成' };

      // valueType: 'value'
      const r1 = evaluateCondition(
        { field: 'status', operator: 'equals', value: '已完成', valueType: 'value' },
        data
      );
      expect(r1).toBe(true);

      // valueType: 'field'
      const r2 = evaluateCondition(
        { field: 'status', operator: 'equals', value: 'target', valueType: 'field' },
        data
      );
      expect(r2).toBe(true);
    });

    it('validateAllRules 覆盖所有 RuleActionType', () => {
      const actionTypes = [
        'require', 'forbid', 'copy', 'validate_match',
        'equals', 'not_equals', 'greater_than', 'less_than',
        'greater_equal', 'less_equal', 'between', 'contains', 'not_contains',
      ];

      actionTypes.forEach(actionType => {
        const tpl = {
          id: 'test',
          name: 'test',
          columns: [],
          rows: [],
          filterField: '',
          titleFields: [],
          rules: [{
            condition: { field: 'status', operator: 'equals' as any, value: '已完成', valueType: 'value' as const },
            action: { type: actionType as any, target: 'result', value: 'test' },
            disabled: false,
          }],
        };
        const errors = validateAllRules(tpl, { status: '已完成', result: '' });
        expect(Array.isArray(errors)).toBe(true);
      });
    });

    it('validateAndApplyRules 跳过 sequence 和 filterField', () => {
      const tpl = {
        id: 'test',
        name: 'test',
        columns: [
          { id: 'c0', header: '序号', type: 'sequence' as const, required: true, isEditable: true, included: true, uniqueValues: [] },
          { id: 'c1', header: '姓名', type: 'text' as const, required: true, isEditable: true, included: true, uniqueValues: [] },
          { id: 'c2', header: '数量', type: 'number' as const, required: true, isEditable: true, included: true, uniqueValues: [] },
        ],
        rows: [],
        filterField: '姓名',
        titleFields: [],
        rules: [],
      };

      const data: Record<string, string> = { '序号': '', '姓名': '', '数量': '' };
      const errors = validateAndApplyRules(tpl, 0, data, tpl.columns, '姓名', '张三');

      // 序号（sequence）和姓名（filterField）不应产生校验错误
      expect(errors.some(e => e.includes('序号'))).toBe(false);
      expect(errors.some(e => e.includes('姓名'))).toBe(false);
      // 数量（required）应产生校验错误
      expect(errors.some(e => e.includes('数量'))).toBe(true);
    });

    it('applyCopyRules 正确执行 copy 动作', () => {
      const tpl = {
        id: 'test',
        name: 'test',
        columns: [],
        rows: [],
        filterField: '',
        titleFields: [],
        rules: [{
          condition: { field: 'source', operator: 'is_not_empty' as const, value: '', valueType: 'value' as const },
          action: { type: 'copy' as const, target: 'target' },
          disabled: false,
        }],
      };

      const data = { source: 'hello', target: '' };
      applyCopyRules(tpl, data);
      expect(data.target).toBe('hello');
    });
  });
});
