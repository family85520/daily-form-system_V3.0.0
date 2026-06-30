# 开发指南

> 每日数据填报系统 V3.0.0 — 前端开发规范与指南

---

## 目录

- [开发环境](#开发环境)
- [项目结构](#项目结构)
- [编码规范](#编码规范)
- [组件开发](#组件开发)
- [状态管理](#状态管理)
- [Composables 开发](#composables-开发)
- [API 层开发](#api-层开发)
- [类型定义](#类型定义)
- [样式开发](#样式开发)
- [测试](#测试)
- [调试技巧](#调试技巧)
- [常见问题](#常见问题)

---

## 开发环境

### 前置要求

| 组件 | 版本 |
|------|------|
| Node.js | ≥ 16.x |
| npm | ≥ 8.x |

### 安装依赖

```bash
npm install
```

### 启动开发环境

需要同时启动两个服务：

```bash
# 终端 1: 启动后端服务
npm run server

# 终端 2: 启动 Vite 前端开发服务器
npm run dev
```

- 前端: `http://localhost:5173`
- 后端: `http://localhost:3000`
- Vite 开发服务器自动将 `/api` 请求代理到后端

---

## 项目结构

```
src/
├── main.ts                          # 入口文件
├── App.vue                          # 根组件
├── env.d.ts                         # 类型声明
├── constants.ts                     # 前端常量
│
├── router/                          # 路由配置
│   └── index.ts
│
├── stores/                          # Pinia 状态管理
│   ├── useAuthStore.ts
│   └── useDataStore.ts
│
├── composables/                     # 组合式函数
│   ├── useLoading.ts
│   ├── useConfirm.ts
│   ├── useToast.ts
│   ├── useValidation.ts
│   ├── useFormSessionEdits.ts
│   ├── useInheritance.ts
│   └── useSequence.ts
│
├── api/                             # API 封装
│   ├── index.ts
│   ├── auth.ts
│   ├── data.ts
│   ├── template.ts
│   ├── submission.ts
│   ├── member.ts
│   └── export.ts
│
├── types/                           # TypeScript 类型
│   └── index.ts
│
├── views/                           # 页面组件
│   ├── FillPage.vue
│   ├── HistoryPage.vue
│   ├── StatPage.vue
│   └── AdminPage.vue
│
├── components/                      # 组件
│   ├── layout/                      # 布局组件
│   ├── fill/                        # 填报组件
│   ├── stat/                        # 统计组件
│   ├── admin/                       # 管理组件
│   ├── common/                      # 通用组件
│   └── template/                    # 模板组件
│
├── utils/                           # 工具函数
│   └── date.ts
│
├── theme/                           # 主题配置
│   └── index.ts
│
├── styles/                          # 样式文件
│   ├── variables.scss
│   ├── global.scss
│   └── buttons.scss
│
└── assets/                          # 静态资源
```

---

## 编码规范

### Vue 组件

- 使用 `<script setup lang="ts">` 语法
- 仅使用 Composition API，不使用 Options API
- 所有 Naive UI 组件必须显式导入（不使用 `unplugin-vue-components`）

```vue
<script setup lang="ts">
import { NButton, NCard, NTabs } from 'naive-ui'
import { ref, computed } from 'vue'

const visible = ref(false)
const handleSubmit = () => {
  // ...
}
</script>
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `RecordCard.vue` |
| 文件名 | kebab-case | `use-toast.ts` |
| 函数名 | camelCase | `handleSubmit()` |
| 常量 | UPPER_SNAKE_CASE | `TOAST_DURATION` |
| 类型/接口 | PascalCase | `Template`, `Column` |
| Store | use + PascalCase | `useAuthStore` |
| Composable | use + PascalCase | `useInheritance` |

### 导入顺序

1. Vue 核心 (`ref`, `computed`, `watch`, `onMounted` 等)
2. 第三方库 (`naive-ui`, `axios` 等)
3. 项目内部 (`@/stores`, `@/composables`, `@/api` 等)
4. 相对路径导入

```typescript
import { ref, computed, watch } from 'vue'
import { NButton, NInput } from 'naive-ui'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToast } from '@/composables/useToast'
import { fetchData } from '@/api/data'
```

---

## 组件开发

### 组件分类

| 类别 | 目录 | 职责 |
|------|------|------|
| 布局 | `components/layout/` | 页面框架结构 |
| 填报 | `components/fill/` | 数据录入相关 |
| 统计 | `components/stat/` | 数据分析相关 |
| 管理 | `components/admin/` | 系统管理相关 |
| 通用 | `components/common/` | 跨页面复用 |
| 模板 | `components/template/` | 模板相关 |

### 弹窗组件规范

所有弹窗使用 `BaseModal.vue` 容器，遵循以下规则：

1. **使用 `v-show` 而非 `v-if`**: 防止 DOM 重排跳动
2. **渲染在页面根层级**: 不要嵌套在子组件内，确保 `position: fixed` 不被父元素 overflow 裁剪
3. **危险操作使用红色警告**: 通过 `confirmDanger()` 调用

### 响应式设计

| 断点 | 设备 | 布局 |
|------|------|------|
| `< 768px` | 手机 | 顶部栏 + 底部标签栏 |
| `≥ 768px` | 桌面 | 左侧边栏 + 顶部栏 + 主内容区 |

使用 CSS 变量 `--breakpoint-sm` (768px) 作为断点。

### 样式规范

```scss
// 使用 CSS 自定义属性
.my-component {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

// 使用 Naive UI 主题变量
.n-button {
  --n-border-radius: var(--radius-lg);
}
```

---

## 状态管理

### Pinia Store 规范

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppState } from '@/types'

export const useAppStore = defineStore('app', () => {
  // State
  const count = ref(0)
  const list = ref<string[]>([])

  // Computed
  const doubled = computed(() => count.value * 2)
  const isEmpty = computed(() => list.value.length === 0)

  // Actions
  function increment() {
    count.value++
  }

  function addItem(item: string) {
    list.value.push(item)
  }

  return { count, list, doubled, isEmpty, increment, addItem }
})
```

### useDataStore 使用要点

1. **乐观更新**: 保存操作先更新本地状态，再同步到后端
2. **失败回滚**: 后端同步失败时自动回滚本地状态
3. **连接状态**: 通过 `connectionStatus` 监控服务器连通性
4. **模板切换**: 使用 `setActiveTemplate()` 切换当前模板

### useAuthStore 使用要点

1. **Token 自动注入**: `authHeaders` 计算属性自动附加 Token
2. **401 自动处理**: API 拦截器在收到 401 时自动清除认证
3. **密码验证**: `verify()` 方法返回 Token 并存储

---

## Composables 开发

### 命名规范

所有 composables 以 `use` 开头，采用 PascalCase：

```typescript
// ✅ 正确
export function useMyFeature() { ... }

// ❌ 错误
export function myFeature() { ... }
export const useMyFeature = () => { ... }  // 也可以，但函数声明更清晰
```

### 常用 Composables

| Composable | 用途 | 返回值 |
|------------|------|--------|
| `useToast()` | 通知消息 | `toast()`, `toastSuccess()`, `toastWarning()`, `toastError()` |
| `useConfirm()` | 确认对话框 | `confirmModal()`, `confirmDanger()` |
| `useLoading()` | 加载遮罩 | `showLoading()`, `hideLoading()` |

### 编写 composables 注意事项

1. **不直接操作 DOM**: 使用 Naive UI discrete API
2. **模块级状态谨慎使用**: `useFormSessionEdits` 使用 `Map` 追踪编辑状态，需在适当时机 `clearAll()`
3. **响应式依赖**: 确保 computed 属性正确依赖响应式数据（如 `useInheritance` 中依赖 `dataStore.sub`）

---

## API 层开发

### Axios 实例配置

```typescript
// api/index.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器：自动注入 Token
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.sessionToken) {
    config.headers['X-Auth-Token'] = authStore.sessionToken
  }
  return config
})

// 响应拦截器：401 自动登出
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
    }
    return Promise.reject(error)
  }
)
```

### API 模块编写规范

```typescript
// api/example.ts
import { api } from './index'
import type { ExampleResponse } from '@/types'

export function getExample(): Promise<ExampleResponse> {
  return api.get('/example').then(r => r.data)
}

export function createExample(data: ExampleRequest): Promise<void> {
  return api.post('/example', data).then(r => r.data)
}
```

---

## 类型定义

所有类型定义集中在 `src/types/index.ts`。

### 添加新类型的原则

1. **简单类型使用 union**: `type Status = 'active' | 'inactive'`
2. **对象结构使用 interface**: `interface Template { ... }`
3. **相关类型放在一组**: 按功能模块组织，加注释分隔
4. **避免 any**: 使用 `unknown` 或具体类型

### 类型导入

```typescript
import type { Template, Column, Submission } from '@/types'
```

---

## 样式开发

### CSS 变量体系

所有设计令牌定义在 `src/styles/variables.scss`：

```scss
:root {
  // 颜色
  --color-primary: #26A69A;
  --color-primary-light: #4DB6AC;
  --color-primary-dark: #00796B;
  
  // 背景
  --bg-primary: #FFFFFF;
  --bg-secondary: #F5F7FA;
  --bg-gradient: linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%);
  
  // 玻璃态
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: 1px solid rgba(255, 255, 255, 0.3);
  
  // 间距 (4px 网格)
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  // 圆角
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### 全局样式

`src/styles/global.scss` 包含：
- CSS Reset
- 字体设置
- 滚动条美化
- 动画定义 (`fade-in`, `slide-up`, `spin`, `scale-in`, `pulse-oxy`)
- 响应式工具类

### 按钮样式

`src/styles/buttons.scss` 定义了按钮变体和交互效果，优先使用 Naive UI 的 `n-button` 组件配合 CSS 变量。

---

## 测试

### 运行测试

```bash
# 单次运行
npm run test

# Watch 模式
npm run test:watch

# 覆盖率
npm run test:coverage

# 单个测试文件
npx vitest run tests/composables/useValidation.test.ts
```

### 测试文件规范

- 测试文件放在 `tests/` 目录，镜像 `src/` 结构
- 文件命名: `*.test.ts`
- 使用 Vitest 框架

### 测试覆盖重点

| 模块 | 测试重点 |
|------|---------|
| `useValidation` | 11 种操作符、13 种动作类型、边界条件 |
| `useInheritance` | 三级继承逻辑、整行继承、空行处理 |
| `useSequence` | 递增逻辑、缓存命中/失效 |
| `useFormSessionEdits` | 复合键追踪、clearAll 清理 |
| API 层 | 拦截器行为、401 处理 |

---

## 调试技巧

### 开发工具

| 工具 | 用途 |
|------|------|
| Vue Devtools | 组件树、Pinia 状态查看 |
| 浏览器 Network | API 请求/响应查看 |
| 浏览器 Console | 日志和调试 |

### 常见问题排查

```typescript
// 1. 打印当前状态
console.log('DataStore:', useDataStore.$state)
console.log('AuthStore:', useAuthStore.$state)

// 2. 手动触发 API 请求
fetch('/api/data').then(r => r.json()).then(console.log)

// 3. 检查 Token
const authStore = useAuthStore()
console.log('Token:', authStore.sessionToken)
console.log('Headers:', authStore.authHeaders)
```

### 双轨切换调试

```bash
# 切换到 v1 查看旧前端
curl -X POST http://localhost:3000/api/admin/switch-frontend \
  -H "Content-Type: application/json" \
  -d '{"version":"v1"}'

# 切换回 v2
curl -X POST http://localhost:3000/api/admin/switch-frontend \
  -H "Content-Type: application/json" \
  -d '{"version":"v2"}'
```

---

## 常见问题

### Q: 为什么 Naive UI 组件不显示？

A: 项目不使用 `unplugin-vue-components`，所有 Naive UI 组件必须显式导入：

```typescript
// ✅ 正确
import { NButton } from 'naive-ui'

// ❌ 错误 - 忘记导入，组件会静默不显示
// <n-button>点击</n-button>
```

### Q: 如何添加新的路由？

A: 在 `src/router/index.ts` 中添加路由配置，并确保对应的页面组件在 `src/views/` 中创建。

### Q: 样式不生效怎么办？

A: 检查是否使用了正确的 CSS 变量名，以及是否在组件的 `<style scoped>` 中正确引用。全局样式应在 `main.ts` 中导入。

### Q: 如何调试继承逻辑？

A: `useInheritance` 的 `effectiveValues` 是 computed 属性，可以在 Vue Devtools 中查看其值变化。也可在组件中临时打印：

```vue
<script setup>
const { effectiveValues } = useInheritance()
console.log('Effective values:', effectiveValues.value)
</script>
```

### Q: 提交后数据没有保存？

A: 检查：
1. 网络连接状态（顶部栏连接指示器）
2. 浏览器控制台是否有错误
3. 后端服务是否正常运行
4. 速率限制是否被触发（429 响应）
