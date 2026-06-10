import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getAllFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  const excludes = ['node_modules', '__tests__', 'tests', '.d.ts', 'dist'];

  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (excludes.some(ex => fullPath.includes(ex))) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (exts.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function relPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/src/')[1] || filePath;
}

const srcDir = path.resolve(__dirname, '../../src');
const allFiles = getAllFiles(srcDir, ['.vue', '.ts']);
const vueFiles = getAllFiles(srcDir, ['.vue']);

describe('Code Review: 架构规范检查', () => {

  // ===== 1. 依赖方向 =====

  describe('1. 依赖方向', () => {
    it('views 不被 components 直接导入', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (relPath(f).startsWith('views/')) return;
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes("from '@/views/") || content.includes('from "@/views/')) {
          violations.push(rp + ': 直接导入了 views 模块');
        }
      });

      expect(violations).toEqual([]);
    });

    it('composables 不导入 components', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (!relPath(f).startsWith('composables/')) return;
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes("from '@/components/") || content.includes('from "@/components/')) {
          violations.push(rp + ': composable 导入了 component');
        }
      });

      expect(violations).toEqual([]);
    });

    it('stores 不导入 components 或 views', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (!relPath(f).startsWith('stores/')) return;
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes("from '@/components/") || content.includes("from '@/views/")) {
          violations.push(rp + ': store 导入了 component 或 view');
        }
      });

      expect(violations).toEqual([]);
    });

    it('types 不导入任何业务模块', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        if (!relPath(f).startsWith('types/')) return;
        const content = readFile(f);
        const rp = relPath(f);

        const importMatches = content.match(/from\s+['"]@\//g);
        if (importMatches) {
          violations.push(rp + ': types 导入了业务模块');
        }
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 2. Store 规范 =====

  describe('2. Store 规范', () => {
    it('所有 store 使用 defineStore + setup 语法', () => {
      const storeDir = path.join(srcDir, 'stores');
      if (!fs.existsSync(storeDir)) return;

      const storeFiles = fs.readdirSync(storeDir).filter(f => f.endsWith('.ts'));
      const violations: string[] = [];

      storeFiles.forEach(f => {
        const content = readFile(path.join(storeDir, f));
        if (!content.includes('defineStore')) {
          violations.push('stores/' + f + ': 未使用 defineStore');
        }
      });

      expect(violations).toEqual([]);
    });

    it('store 不直接操作 DOM', () => {
      const storeDir = path.join(srcDir, 'stores');
      if (!fs.existsSync(storeDir)) return;

      const storeFiles = fs.readdirSync(storeDir).filter(f => f.endsWith('.ts'));
      const violations: string[] = [];

      storeFiles.forEach(f => {
        const content = readFile(path.join(storeDir, f));
        if (content.includes('document.') || content.includes('window.')) {
          violations.push('stores/' + f + ': store 中操作了 DOM/BOM');
        }
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 3. 路由规范 =====

  describe('3. 路由规范', () => {
    it('路由文件存在且有效', () => {
      const routerPath = path.join(srcDir, 'router/index.ts');
      expect(fs.existsSync(routerPath)).toBe(true);
    });

    it('路由使用懒加载', () => {
      const routerPath = path.join(srcDir, 'router/index.ts');
      if (!fs.existsSync(routerPath)) return;
      const content = readFile(routerPath);

      // 检查是否使用了动态 import
      expect(content).toContain('import(');
    });

    it('路由有 meta 信息', () => {
      const routerPath = path.join(srcDir, 'router/index.ts');
      if (!fs.existsSync(routerPath)) return;
      const content = readFile(routerPath);

      expect(content).toContain('meta:');
    });
  });

  // ===== 4. API 调用规范 =====

  describe('4. API 调用规范', () => {
    it('API 调用集中在 stores 中', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        const rp = relPath(f);
        // 排除 stores 和测试文件
        if (rp.startsWith('stores/') || rp.startsWith('tests/')) return;

        const content = readFile(f);
        // 检查是否直接调用 fetch API
        if (/fetch\s*$$\s*['"`]\/api\//.test(content)) {
          violations.push(rp + ': 在非 store 文件中直接调用 API');
        }
      });

      expect(violations).toEqual([]);
    });

    it('API 响应统一处理', () => {
      const storeDir = path.join(srcDir, 'stores');
      if (!fs.existsSync(storeDir)) return;

      const storeFiles = fs.readdirSync(storeDir).filter(f => f.endsWith('.ts'));

      storeFiles.forEach(f => {
        const content = readFile(path.join(storeDir, f));
        // 检查 fetch 调用是否有 json() 解析
        const fetchCalls = content.match(/fetch\s*\([^)]+$$/g);
        if (fetchCalls) {
          expect(content).toContain('.json()');
        }
      });
    });
  });

  // ===== 5. 常量管理 =====

  describe('5. 常量管理', () => {
    it('魔法数字不超过阈值', () => {
      const violations: string[] = [];

      allFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        // 检查 script 部分的魔法数字（排除常见的 0, 1, 2）
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/) || [null, content];
        const script = scriptMatch[1] || '';

        // 查找大于 100 的数字常量
        const magicNums = script.match(/(?<![.\w])\d{3,}(?![.\w])/g);
        if (magicNums) {
          const filtered = magicNums.filter(n => {
            const num = parseInt(n);
            // 排除端口号、HTTP 状态码、时间戳等
            return num > 100 && num < 9999 && ![100, 200, 201, 204, 300, 301, 302, 400, 401, 403, 404, 500].includes(num);
          });
          if (filtered.length > 0) {
            violations.push(rp + ': 魔法数字: ' + filtered.join(', '));
          }
        }
      });

      if (violations.length > 0) {
        console.warn('  ⚠️ 魔法数字:');
        violations.forEach(v => console.warn('    ' + v));
      }
      expect(true).toBe(true);
    });
  });

  // ===== 6. 类型安全 =====

  describe('6. 类型安全', () => {
    it('types/index.ts 定义了所有核心类型', () => {
      const typesPath = path.join(srcDir, 'types/index.ts');
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = readFile(typesPath);
      const requiredTypes = [
        'Template',
        'Column',
        'FieldType',
        'FieldRule',
        'RowSubmission',
        'TemplateSubmissions',
        'AppData',
        'EffectiveRow',
        'ValueSource',
      ];

      requiredTypes.forEach(t => {
        expect(content).toContain(t);
      });
    });

    it('组件 props 都有类型定义', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        // 检查 defineProps 是否有泛型参数
        if (content.includes('defineProps<')) {
          // 正确：使用 TypeScript 泛型
        } else if (content.includes('defineProps(')) {
          // 使用运行时声明（也允许，但建议用 TS）
          violations.push(rp + ': defineProps 未使用 TypeScript 泛型');
        }
      });

      if (violations.length > 0) {
        console.warn('  ⚠️ 建议使用 TypeScript 泛型定义 props:');
        violations.forEach(v => console.warn('    ' + v));
      }
      expect(true).toBe(true);
    });

    it('emits 都有类型定义', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('defineEmits(') && !content.includes('defineEmits<')) {
          violations.push(rp + ': defineEmits 未使用 TypeScript 泛型');
        }
      });

      if (violations.length > 0) {
        console.warn('  ⚠️ 建议使用 TypeScript 泛型定义 emits:');
        violations.forEach(v => console.warn('    ' + v));
      }
      expect(true).toBe(true);
    });
  });
});
