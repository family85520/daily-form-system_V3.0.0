import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
  // ===== 忽略目录 =====
  {
    ignores: [
      'dist/',
      'node_modules/',
      'public/',
      '*.d.ts',
      'tests/',
      'src/db/**',
      'src/middleware/**',
      'src/routes/**',
      'src/services/**',
      'src/config/**',
    ],
  },

  // JS 推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  // Vue 推荐规则
  ...pluginVue.configs['flat/recommended'],

  // ===== 前端代码规则 =====
  {
    files: ['**/*.ts', '**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // 浏览器全局变量
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLDivElement: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        DragEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Node: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
      },
    },
    rules: {
      // ---- 代码质量 ----
      'no-console': 'off',
      'no-debugger': 'error',
      'no-alert': 'off',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      'eqeqeq': 'warn',
      'curly': ['error', 'multi-line'],
      'no-prototype-builtins': 'warn',
      'no-useless-assignment': 'warn',
      'no-redeclare': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],

      // ---- TypeScript ----
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-non-null-assertion': 'off',

      // ---- Vue ----
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
    },
  },
);
