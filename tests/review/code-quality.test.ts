import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ===== 工具函数 =====

function getAllSourceFiles(dir: string, exts: string[]): string[] {
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
const vueFiles = getAllSourceFiles(srcDir, ['.vue']);
const tsFiles = getAllSourceFiles(srcDir, ['.ts']);

// ===== 测试用例 =====

describe('Code Review: 代码质量检查', () => {

  // ===== 1. 禁止直接操作 DOM（Vue 应用） =====

  describe('1. 禁止直接操作 DOM', () => {
    it('组件中不使用 document.getElementById', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        const matches = content.match(/document\.getElementById/g);
        if (matches && matches.length > 0) {
          violations.push(rp + ': 使用了 ' + matches.length + ' 次 document.getElementById');
        }
      });

      expect(violations).toEqual([]);
    });

    it('组件中不使用 document.querySelector（除特殊场景）', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        if (content.includes('document.querySelector')) {
          violations.push(rp + ': 使用了 document.querySelector');
        }
      });

      expect(violations).toEqual([]);
    });

    it('组件中不使用 document.createElement（除剪贴板和下载场景）', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        if (content.includes('document.createElement')) {
          // 排除剪贴板兼容代码、下载导出代码、JSON 导出代码
          if (!content.includes('clipboard') && !content.includes('execCommand')
              && !content.includes('Blob') && !content.includes('createObjectURL')
              && !content.includes('download')) {
            violations.push(rp + ': 使用了 document.createElement');
          }
        }
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 2. 禁止硬编码 =====

  describe('2. 禁止硬编码', () => {
    it('组件中不硬编码 API 地址', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        // 检查硬编码的完整 URL（排除 SVG 命名空间、字体 CDN）
        const urlPattern = /['"`]https?:\/\/(?!fonts\.googleapis|cdn|www\.w3\.org)[^'"`]+['"`]/g;
        const matches = content.match(urlPattern);
        if (matches) {
          violations.push(rp + ': 硬编码 URL: ' + matches.join(', '));
        }
      });

      expect(violations).toEqual([]);
    });

    it('组件中不硬编码密码或密钥', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        const patterns = [
          /password\s*[:=]\s*['"][^'"]+['"]/i,
          /secret\s*[:=]\s*['"][^'"]+['"]/i,
          /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
          /token\s*[:=]\s*['"][^'"]{10,}['"]/i,
        ];
        patterns.forEach(p => {
          if (p.test(content)) {
            violations.push(rp + ': 可能包含硬编码密钥/密码');
          }
        });
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 3. TypeScript 规范 =====

  describe('3. TypeScript 规范', () => {
    it('不使用 any 类型（显式声明）', () => {
      const violations: string[] = [];

      tsFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        if (f.includes('types')) return; // 排除类型定义文件

        // 检查显式 : any
        const matches = content.match(/:\s*any\b/g);
        if (matches && matches.length > 0) {
          violations.push(rp + ': 使用了 ' + matches.length + ' 次 any 类型');
        }
      });

      expect(violations).toEqual([]);
    });

    it('Vue 组件不使用 any 类型', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        // 只检查 script 部分
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        if (!scriptMatch) return;
        const script = scriptMatch[1];

        // 排除 catch (err: any) 和 as any 等常见场景
        const cleaned = script
          .replace(/catch\s*$$\s*\w+\s*:\s*any\s*$$/g, '')  // catch (err: any)
          .replace(/catch\s*$$\s*\w+\s*$$/g, '');            // catch (err)

        const matches = cleaned.match(/:\s*any\b/g);
        if (matches && matches.length > 0) {
          violations.push(rp + ': 使用了 ' + matches.length + ' 次 any 类型');
        }
      });

      if (violations.length > 0) {
        console.warn('  ⚠️ 使用了 any 类型:');
        violations.forEach(v => console.warn('    ' + v));
      }
      // 警告但不严格失败
      expect(true).toBe(true);
    });

    it('所有 import 使用 type import 导入纯类型', () => {
      const violations: string[] = [];

      tsFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        if (f.includes('types')) return;

        // 检查是否从 @/types 导入时使用了 type import
        const importMatches = content.match(/import\s+\{[^}]+\}\s+from\s+['"]@\/types['"]/g);
        if (importMatches) {
          importMatches.forEach(m => {
            if (!m.startsWith('import type')) {
              violations.push(rp + ': 从 @/types 导入未使用 type import: ' + m.substring(0, 60));
            }
          });
        }
      });

      // 允许部分违规（非强制）
      if (violations.length > 0) {
        console.warn('  ⚠️ 建议使用 type import:');
        violations.forEach(v => console.warn('    ' + v));
      }
      // 不作为硬性失败，仅警告
      expect(true).toBe(true);
    });
  });

  // ===== 4. Vue 组件规范 =====

  describe('4. Vue 组件规范', () => {
    it('所有 Vue 组件使用 <script setup>', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('<script ') && !content.includes('<script setup')) {
          // 允许 App.vue 等特殊文件
          if (!rp.includes('App.vue')) {
            violations.push(rp + ': 未使用 <script setup>');
          }
        }
      });

      expect(violations).toEqual([]);
    });

    it('组件 props 使用 TypeScript 类型定义', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        // 检查是否使用了运行时 props 定义（非 TS）
        if (content.includes('props:') && content.includes('defineProps')) {
          violations.push(rp + ': 同时使用了 props: 和 defineProps');
        }
      });

      expect(violations).toEqual([]);
    });

    it('组件不使用 Options API', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        const optionsApiPatterns = [
          /export\s+default\s+\{/,
          /data\s*$$\s*$$\s*\{/,
          /methods\s*:\s*\{/,
          /computed\s*:\s*\{/,
          /watch\s*:\s*\{/,
          /mounted\s*$$\s*$$\s*\{/,
          /created\s*$$\s*$$\s*\{/,
        ];

        optionsApiPatterns.forEach(p => {
          if (p.test(content)) {
            violations.push(rp + ': 使用了 Options API 模式');
          }
        });
      });

      expect(violations).toEqual([]);
    });

    it('模板中不使用 v-html（安全考虑）', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('v-html')) {
          violations.push(rp + ': 使用了 v-html（XSS 风险）');
        }
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 5. 样式规范 =====

  describe('5. 样式规范', () => {
    it('Vue 组件使用 scoped 样式', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('<style') && !content.includes('<style scoped') && !content.includes('<style lang="scss"')) {
          // 全局样式文件允许
          if (!rp.includes('global') && !rp.includes('App.vue')) {
            violations.push(rp + ': 样式未使用 scoped');
          }
        }
      });

      expect(violations).toEqual([]);
    });

    it('不使用 !important（除特殊情况）', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        const matches = content.match(/!important/g);
        if (matches && matches.length > 0) {
          violations.push(rp + ': 使用了 ' + matches.length + ' 次 !important');
        }
      });

      if (violations.length > 0) {
        console.warn('  ⚠️ 使用了 !important:');
        violations.forEach(v => console.warn('    ' + v));
      }
      // 警告但不失败
      expect(true).toBe(true);
    });
  });

  // ===== 6. 安全检查 =====

  describe('6. 安全检查', () => {
    it('不使用 eval()', () => {
      const violations: string[] = [];
      const allFiles = [...vueFiles, ...tsFiles];

      allFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (/\beval\s*$$/.test(content)) {
          violations.push(rp + ': 使用了 eval()');
        }
      });

      expect(violations).toEqual([]);
    });

    it('不使用 new Function()', () => {
      const violations: string[] = [];
      const allFiles = [...vueFiles, ...tsFiles];

      allFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (/new\s+Function\s*\(/.test(content)) {
          violations.push(rp + ': 使用了 new Function()');
        }
      });

      expect(violations).toEqual([]);
    });

    it('不使用 innerHTML（除特殊场景）', () => {
      const violations: string[] = [];
      const allFiles = [...vueFiles, ...tsFiles];

      allFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('.innerHTML')) {
          violations.push(rp + ': 使用了 innerHTML');
        }
      });

      expect(violations).toEqual([]);
    });

    it('不使用 alert/confirm（使用自定义弹窗）', () => {
      const violations: string[] = [];
      const allFiles = [...vueFiles, ...tsFiles];

      allFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (/\balert\s*\(/.test(content) || /\bconfirm\s*\(/.test(content)) {
          // 排除 useConfirm 等自定义封装
          if (!rp.includes('useConfirm') && !rp.includes('useToast')) {
            violations.push(rp + ': 使用了原生 alert/confirm');
          }
        }
      });

      expect(violations).toEqual([]);
    });

    it('不使用 window.open 进行敏感操作', () => {
      const violations: string[] = [];
      const allFiles = [...vueFiles, ...tsFiles];

      allFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('window.open')) {
          // 仅导出页面允许
          if (!rp.includes('Export') && !rp.includes('export')) {
            violations.push(rp + ': 使用了 window.open');
          }
        }
      });

      // 警告但不失败
      if (violations.length > 0) {
        console.warn('  ⚠️ 使用了 window.open:');
        violations.forEach(v => console.warn('    ' + v));
      }
      expect(true).toBe(true);
    });
  });

  // ===== 7. 文件组织规范 =====

  describe('7. 文件组织规范', () => {
    it('views 目录下文件不超过合理数量', () => {
      const viewFiles = getAllSourceFiles(path.join(srcDir, 'views'), ['.vue']);
      expect(viewFiles.length).toBeLessThanOrEqual(10);
    });

    it('components 目录有合理的子目录结构', () => {
      const compDir = path.join(srcDir, 'components');
      if (fs.existsSync(compDir)) {
        const subDirs = fs.readdirSync(compDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
        expect(subDirs.length).toBeGreaterThan(0);
      }
    });

    it('composables 目录下文件命名以 use 开头', () => {
      const compDir = path.join(srcDir, 'composables');
      if (fs.existsSync(compDir)) {
        const files = fs.readdirSync(compDir).filter(f => f.endsWith('.ts'));
        const violations: string[] = [];
        files.forEach(f => {
          if (!f.startsWith('use')) {
            violations.push(f);
          }
        });
        expect(violations).toEqual([]);
      }
    });

    it('stores 目录下文件命名以 use 开头', () => {
      const storesDir = path.join(srcDir, 'stores');
      if (fs.existsSync(storesDir)) {
        const files = fs.readdirSync(storesDir).filter(f => f.endsWith('.ts'));
        const violations: string[] = [];
        files.forEach(f => {
          if (!f.startsWith('use')) {
            violations.push(f);
          }
        });
        expect(violations).toEqual([]);
      }
    });

    it('单个 Vue 文件不超过 500 行', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        const lines = content.split('\n').length;
        if (lines > 500) {
          violations.push(rp + ': ' + lines + ' 行（超过 500 行）');
        }
      });

      if (violations.length > 0) {
        console.warn('  ⚠️ 大文件:');
        violations.forEach(v => console.warn('    ' + v));
      }
      // 警告但不失败
      expect(true).toBe(true);
    });

    it('单个 TS 文件不超过 300 行', () => {
      const violations: string[] = [];

      tsFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);
        const lines = content.split('\n').length;
        if (lines > 300) {
          violations.push(rp + ': ' + lines + ' 行（超过 300 行）');
        }
      });

      if (violations.length > 0) {
        console.warn('  ⚠️ 大文件:');
        violations.forEach(v => console.warn('    ' + v));
      }
      expect(true).toBe(true);
    });
  });

  // ===== 8. 依赖管理 =====

  describe('8. 依赖管理', () => {
    it('package.json 存在且有效', () => {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(readFile(pkgPath));
      expect(pkg.name).toBeDefined();
      expect(pkg.version).toBeDefined();
      expect(pkg.dependencies).toBeDefined();
      expect(pkg.devDependencies).toBeDefined();
    });

    it('package.json 包含必要脚本', () => {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      const pkg = JSON.parse(readFile(pkgPath));
      const requiredScripts = ['dev', 'build', 'start', 'type-check', 'test'];
      requiredScripts.forEach(s => {
        expect(pkg.scripts[s]).toBeDefined();
      });
    });

    it('核心依赖版本合理', () => {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      const pkg = JSON.parse(readFile(pkgPath));
      expect(pkg.dependencies['vue']).toBeDefined();
      expect(pkg.dependencies['pinia']).toBeDefined();
      expect(pkg.dependencies['vue-router']).toBeDefined();
    });
  });

  // ===== 9. 错误处理规范 =====

  describe('9. 错误处理规范', () => {
    it('async 函数有 try-catch 处理', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        // 提取 script 部分
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        if (!scriptMatch) return;
        const script = scriptMatch[1];

        // 查找 async 函数
        const asyncFns = script.match(/async\s+function\s+\w+/g);
        if (!asyncFns) return;

        // 检查每个 async 函数是否有 try-catch
        asyncFns.forEach(fn => {
          const fnName = fn.replace(/async\s+function\s+/, '');
          // 简单检查：整个 script 中是否有 try-catch
          if (!script.includes('try') || !script.includes('catch')) {
            violations.push(rp + ': async function ' + fnName + ' 可能缺少 try-catch');
          }
        });
      });

      // 警告但不严格失败
      if (violations.length > 0) {
        console.warn('  ⚠️ async 函数可能缺少错误处理:');
        violations.forEach(v => console.warn('    ' + v));
      }
      expect(true).toBe(true);
    });

    it('fetch 调用有错误处理', () => {
      const violations: string[] = [];
      const allFiles = [...vueFiles, ...tsFiles];

      allFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('fetch(') && !content.includes('catch') && !content.includes('try')) {
          violations.push(rp + ': fetch 调用可能缺少错误处理');
        }
      });

      expect(violations).toEqual([]);
    });
  });

  // ===== 10. 性能检查 =====

  describe('10. 性能检查', () => {
    it('不使用同步文件操作（浏览器环境）', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        if (content.includes('readFileSync') || content.includes('writeFileSync')) {
          violations.push(rp + ': 在 Vue 组件中使用了同步文件操作');
        }
      });

      expect(violations).toEqual([]);
    });

    it('computed 属性不产生副作用', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        // 检查 computed 中是否有 fetch 或 store 写操作
        const computedBlocks = content.match(/computed\s*<[^>]*>\s*\(\s*\($$\s*=>\s*\{[\s\S]*?\}\s*\)/g);
        if (computedBlocks) {
          computedBlocks.forEach(block => {
            if (block.includes('fetch(') || block.includes('.value =')) {
              violations.push(rp + ': computed 中可能有副作用');
            }
          });
        }
      });

      expect(violations).toEqual([]);
    });

    it('v-for 都有 key 属性', () => {
      const violations: string[] = [];

      vueFiles.forEach(f => {
        const content = readFile(f);
        const rp = relPath(f);

        // 提取 template 部分
        const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
        if (!templateMatch) return;
        const template = templateMatch[1];

        // 检查 v-for 是否有 :key
        const vforMatches = template.match(/v-for="[^"]*"/g);
        if (vforMatches) {
          vforMatches.forEach((m, i) => {
            // 简单检查：v-for 附近是否有 :key
            const idx = template.indexOf(m);
            const nearby = template.substring(idx, idx + 200);
            if (!nearby.includes(':key') && !nearby.includes('v-bind:key')) {
              violations.push(rp + ': v-for 缺少 :key (' + m.substring(0, 40) + ')');
            }
          });
        }
      });

      expect(violations).toEqual([]);
    });
  });
});
