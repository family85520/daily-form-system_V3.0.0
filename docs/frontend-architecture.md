# 前端架构文档

> 每日数据填报系统 V3.0.0 — 前端技术栈与架构说明

**技术栈**: Vue 3 + TypeScript + Vite + Pinia + Naive UI + Vue Router  
**设计风格**: 碧氧清新风 — Teal 主色调 (`#26A69A`)，大圆角，玻璃态效果

---

## 目录

- [目录结构](#目录结构)
- [类型定义](#类型定义)
- [Pinia 状态管理](#pinia-状态管理)
- [Composables](#composables)
- [API 层](#api-层)
- [路由配置](#路由配置)
- [视图组件](#视图组件)
- [组件分类](#组件分类)
- [主题与样式](#主题与样式)
- [工具模块](#工具模块)
- [关键架构模式](#关键架构模式)

---

## 目录结构

```
src/
├── main.ts                          # 入口文件
├── env.d.ts                         # Vite 客户端 + Vue 组件类型声明
├── constants.ts                     # 前端常量
├── App.vue                          # 根组件
│
├── router/
│   └── index.ts                     # Vue Router 配置（4 个路由 + 守卫）
│
├── stores/                          # Pinia 状态管理
│   ├── useAuthStore.ts              # 认证状态
│   └── useDataStore.ts              # 核心应用数据状态
│
├── composables/                     # 可复用组合式函数
│   ├── useLoading.ts                # 加载遮罩
│   ├── useConfirm.ts                # 确认对话框
│   ├── useToast.ts                  # Toast 通知
│   ├── useValidation.ts             # 字段校验 + 规则引擎
│   ├── useFormSessionEdits.ts       # 会话级编辑追踪
│   ├── useInheritance.ts            # 数据继承逻辑
│   └── useSequence.ts               # 序列号生成
│
├── api/                             # Axios API 封装
│   ├── index.ts                     # Axios 实例 + 拦截器
│   ├── auth.ts                      # 认证相关 API
│   ├── data.ts                      # 数据读取 API
│   ├── template.ts                  # 模板 CRUD API
│   ├── submission.ts                # 提交 API
│   ├── member.ts                    # 成员 API
│   └── export.ts                    # 导出 API
│
├── types/
│   └── index.ts                     # 所有 TypeScript 类型定义
│
├── views/                           # 页面级组件
│   ├── FillPage.vue                 # 填报页面
│   ├── HistoryPage.vue              # 历史页面
│   ├── StatPage.vue                 # 统计页面
│   └── AdminPage.vue                # 管理页面
│
├── components/
│   ├── layout/                      # 布局组件
│   │   ├── AppLayout.vue            # 主布局外壳
│   │   ├── AppHeader.vue            # 顶部导航栏
│   │   ├── AppTabBar.vue            # 移动端底部标签栏
│   │   ├── SidebarNav.vue           # 桌面端左侧导航栏
│   │   └── NavItem.vue              # 导航项
│   │
│   ├── fill/                        # 填报子组件
│   │   ├── FillMain.vue             # 填报主区域
│   │   ├── FillSidebar.vue          # 填报侧边栏
│   │   ├── RecordCard.vue           # 记录卡片
│   │   ├── RecordForm.vue           # 记录表单
│   │   ├── AddRowDialog.vue         # 新增行弹窗
│   │   ├── BatchAddDialog.vue       # 批量新增弹窗
│   │   └── QuickFillDialog.vue      # 快速填写弹窗
│   │
│   ├── stat/                        # 统计分析子组件
│   │   ├── StatOverview.vue         # 统计概览
│   │   ├── StatDataAnalysis.vue     # 数据分析
│   │   ├── NumFieldStats.vue        # 数值字段统计
│   │   ├── CrossStatTable.vue       # 交叉表
│   │   ├── CrossAnalysis.vue        # 交叉分析配置
│   │   ├── CrossStatConfig.vue      # 交叉统计配置弹窗
│   │   └── StatFillAnalysis.vue     # 填报分析
│   │
│   ├── admin/                       # 管理子组件
│   │   ├── AdminOverviewTab.vue     # 管理概览
│   │   ├── AdminTemplatesTab.vue    # 模板管理
│   │   ├── AdminTemplateEditor.vue  # 模板编辑器
│   │   ├── AdminDataTab.vue         # 数据查看
│   │   ├── AdminImportTab.vue       # 数据导入
│   │   ├── AdminExportTab.vue       # 数据导出
│   │   └── AdminAuditTab.vue        # 审计日志
│   │
│   ├── common/                      # 通用组件
│   │   ├── BaseModal.vue            # 弹窗容器
│   │   ├── ErrorListModal.vue       # 错误列表弹窗
│   │   ├── InlineToast.vue          # 内联 Toast
│   │   ├── LoadingOverlay.vue       # 全屏加载遮罩
│   │   ├── PageAuth.vue             # 页面认证守卫
│   │   ├── FilterBar.vue            # 统一筛选栏
│   │   ├── FormField.vue            # 动态表单字段
│   │   └── StatCard.vue             # 统计卡片
│   │
│   └── template/
│       └── TemplateSelector.vue     # 模板选择器
│
├── utils/
│   └── date.ts                      # 日期工具函数
│
├── theme/
│   └── index.ts                     # Naive UI 主题覆盖
│
└── styles/
    ├── variables.scss               # CSS 自定义属性（设计令牌）
    ├── buttons.scss                 # 按钮样式变体
    └── global.scss                  # 全局重置 + 动画
```

---

## 类型定义

### 字段类型

```typescript
type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'date' | 'sequence'

interface FieldConstraints {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  errorMessage?: string
}

interface Column {
  id: string
  header: string
  type: FieldType
  required: boolean
  isEditable: boolean
  included: boolean
  uniqueValues: boolean
  constraints?: FieldConstraints
}
```

### 模板类型

```typescript
interface Template {
  id: string
  name: string
  columns: Column[]
  rows: string[]
  filterField: string
  titleFields: string[]
  rules: FieldRule[]
}

interface FieldRule {
  condition: RuleCondition
  action: RuleAction
  disabled?: boolean
}

type RuleOperator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty'

type RuleActionType = 
  | 'require' | 'forbid' | 'copy' | 'validate_match'
  | 'greater_than' | 'less_than' | 'equal_to'
  | 'greater_equal' | 'less_equal' | 'not_equal'
  | 'required_if' | 'disabled_if' | 'hidden_if'

type ValueSourceType = 'value' | 'field'
```

### 提交数据结构

```typescript
type RowSubmission = Record<string, string>
type UserSubmissions = Record<string, RowSubmission>
type DaySubmissions = Record<string, UserSubmissions>
type TemplateSubmissions = Record<string, DaySubmissions>

interface AppData {
  tpls: Template[]
  members: Record<string, string[]>
  sub: Record<string, TemplateSubmissions>
}
```

### 继承相关

```typescript
type ValueSource = 'today' | 'prev' | 'base' | 'empty'

interface EffectiveValue {
  value: string
  source: ValueSource
}

interface EffectiveRow {
  fieldValues: Record<string, EffectiveValue>
}
```

### 统计相关

```typescript
type AggregateFunction = 'count' | 'sum' | 'avg' | 'max' | 'min' | 'pct'

interface StatMetric {
  key: string
  label: string
  fn: AggregateFunction
  field: string
}

type ConnectionStatus = 'ok' | 'err' | 'loading'
type PageId = 'fill' | 'history' | 'stat' | 'admin'
type AdminTabId = 'overview' | 'templates' | 'data' | 'import' | 'export' | 'audit'
type StatTabId = 'overview' | 'analysis' | 'cross'
```

---

## Pinia 状态管理

### useAuthStore — 认证状态

**State**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `isVerified` | boolean | 是否已通过密码验证 |
| `sessionToken` | string | 会话 Token |

**Computed**:
| 名称 | 说明 |
|------|------|
| `authHeaders` | 自动包含 `x-auth-token` 的请求头对象 |

**Actions**:
| 方法 | 说明 |
|------|------|
| `verify(password)` | 验证密码，获取 Token |
| `checkAuth()` | 检查 Token 有效性 |
| `logout()` | 清除认证状态 |

---

### useDataStore — 数据状态

**State**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `tpls` | Template[] | 所有模板列表 |
| `members` | Record\<string, string[]\> | 模板 → 成员映射 |
| `sub` | Record\<string, TemplateSubmissions\> | 提交数据 |
| `serverConnected` | boolean | 服务器连接状态 |
| `connectionStatus` | ConnectionStatus | 连接状态指示 |
| `activeTemplateId` | string | 当前激活的模板 ID |
| `currentFillUser` | string | 当前填报人 |

**Computed**:
| 名称 | 说明 |
|------|------|
| `activeTemplate` | 当前激活的模板对象 |
| `allMembers` | 所有成员列表（去重） |
| `totalRecords` | 总记录数 |

**Actions**:
| 方法 | 说明 |
|------|------|
| `loadData()` | 从后端加载全部数据 |
| `saveSubmission()` | 保存填报（乐观更新 + 失败回滚） |
| `saveTemplate()` | 保存模板变更 |
| `createTemplate()` | 创建新模板 |
| `deleteTemplate()` | 删除模板 |
| `saveMembers()` | 保存成员列表 |
| `deleteSubmission()` | 删除单条提交 |
| `resetAll()` | 重置所有数据 |
| `normalizeData()` | 兼容旧数据格式 |

**辅助工具**:
| 方法 | 说明 |
|------|------|
| `getTpl(id)` | 获取指定模板 |
| `getTplMembers(id)` | 获取模板成员 |
| `getTplSub(id)` | 获取模板提交数据 |
| `setActiveTemplate(id)` | 设置当前模板 |
| `setCurrentFillUser(user)` | 设置当前填报人 |
| `updateConnStatus(status)` | 更新连接状态 |

---

## Composables

### useLoading — 加载遮罩

响应式加载遮罩状态管理。

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `isVisible` | ref<boolean> | 是否可见 |
| `loadingText` | ref<string> | 加载提示文字 |
| `showLoading(text?)` | function | 显示加载遮罩 |
| `hideLoading()` | function | 隐藏加载遮罩 |

---

### useConfirm — 确认对话框

通过 Naive UI discrete API 实现确认对话框。

| 方法 | 说明 |
|------|------|
| `confirmModal(content, title?)` | 普通确认对话框 |
| `confirmDanger(content, title?)` | 危险操作确认对话框（红色警告） |

---

### useToast — Toast 通知

通过 Naive UI discrete API 实现通知消息。

| 方法 | 说明 |
|------|------|
| `toast(content)` | 普通提示 |
| `toastSuccess(content)` | 成功提示 |
| `toastWarning(content)` | 警告提示 |
| `toastError(content)` | 错误提示 |

---

### useValidation — 校验 + 规则引擎

字段级校验和模板规则引擎。

**校验能力**:
- 必填校验
- 最小/最大值（数字）
- 最小/最大长度（字符串）
- 正则表达式匹配
- 下拉选项校验
- 日期格式校验

**规则引擎**:
- 11 种操作符：`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `notContains`, `startsWith`, `endsWith`, `empty`, `notEmpty`
- 13 种动作类型：`require`, `forbid`, `copy`, `validate_match`, `greater_than`, `less_than`, `equal_to`, `greater_equal`, `less_equal`, `not_equal`, `required_if`, `disabled_if`, `hidden_if`

---

### useFormSessionEdits — 会话编辑追踪

模块级响应式 Map，追踪用户在当前会话中编辑过的字段。

**复合键格式**: `"userId:rowIndex:fieldHeader"`

| 方法 | 说明 |
|------|------|
| `trackEdit(key)` | 标记字段已被编辑 |
| `isEdited(key)` | 检查字段是否被编辑 |
| `clearAll()` | 清除所有编辑记录（用户切换/返回时调用） |

---

### useInheritance — 数据继承

三级数据继承逻辑：**今日 → 最近历史 → 基础模板数据**。

**核心特性**:
- 行级继承，绝不混合不同日期的字段
- 今日已处理但全空的行不回退到历史
- 整体继承保持数据完整性

**Computed**:
| 名称 | 说明 |
|------|------|
| `effectiveValues` | 计算每个字段的实际值（含继承来源标记） |

---

### useSequence — 序列号生成

为 `sequence` 类型字段自动生成递增序号。

**缓存策略**: 模块级缓存，Key 为 `tplId:header`

| 方法 | 说明 |
|------|------|
| `getNextSeqValue(tplId, header)` | 获取下一个序列号 |
| `updateSeqCache(tplId)` | 更新模板序列号缓存 |
| `invalidateTplCache(tplId)` | 使模板缓存失效 |

---

## API 层

基于 **Axios** 封装，统一处理认证和错误。

**Axios 实例配置** (`api/index.ts`):
| 配置项 | 值 | 说明 |
|--------|-----|------|
| `baseURL` | `/api` | 相对路径，由 Vite proxy 转发 |
| `timeout` | 15000 | 15 秒超时 |
| 请求拦截器 | 自动注入 `x-auth-token` | 从 `useAuthStore` 响应式读取 |
| 响应拦截器 | 401 自动登出 | 未授权时清除认证状态并跳转 |

**API 模块**:

| 模块 | 文件 | 端点 |
|------|------|------|
| 认证 | `auth.ts` | POST `/verify`, GET `/auth/check`, POST `/password`, POST `/logout` |
| 数据 | `data.ts` | GET `/data` |
| 模板 | `template.ts` | POST `/template`, PUT `/template/:id`, DELETE `/template/:id` |
| 提交 | `submission.ts` | POST `/submission`, DELETE `/submission` |
| 成员 | `member.ts` | POST `/members` |
| 导出 | `export.ts` | GET `/export/csv`, GET `/export/excel`, POST `/reset` |

---

## 路由配置

| 路径 | 名称 | 组件 | 认证要求 |
|------|------|------|---------|
| `/` | `fill` | `FillPage.vue` | 不需要 |
| `/history` | `history` | `HistoryPage.vue` | 不需要 |
| `/stat` | `stat` | `StatPage.vue` | 需要（未认证跳转 `/admin`） |
| `/admin` | `admin` | `AdminPage.vue` | 页面内密码验证 |

**全局守卫**: 访问 `/stat` 时检查认证状态，未认证则重定向到 `/admin`。

---

## 视图组件

### FillPage — 填报页面

主填报界面，由 `FillSidebar`（侧边栏）+ `FillMain`（主区域）组成。

**桌面端布局**: 固定左侧边栏 (220px) + 固定顶部头部 (56px) + 可滚动主内容区  
**移动端布局**: 固定顶部头部 + 固定底部标签栏

**核心功能**:
- 模板选择 → 用户选择 → 记录卡片列表
- 卡片展开显示表单字段
- 进度条 / 状态标签 / 继承标记
- 快速填写 / 新增行 / 批量新增弹窗
- 提交校验 / 继承操作 / 提交锁（2 秒防重复）

---

### HistoryPage — 历史页面

浏览历史填报记录。

**两种视图**:
- 未选用户 → 按日期聚合视图
- 选择用户 → 按日期列表 + 导出链接

---

### StatPage — 统计页面

统计分析仪表盘，需密码验证。

**三个 Tab**:
1. **概览**: 填报率 KPI 卡片 + 趋势图 + 成员完成率
2. **数据分析**: 数值字段统计（求和/平均/最大/最小）+ 数据明细
3. **交叉分析**: 多行维度 × 多列维度 × 多统计指标的透视表

---

### AdminPage — 管理页面

管理中枢，页面内密码验证。

**六个 Tab**:
1. **概览**: 系统统计摘要
2. **模板管理**: 模板列表 + 新建 / 删除 / 导出 JSON
3. **数据查看**: 浏览/编辑/删除提交数据
4. **数据导入**: JSON 导入 + 预览字段配置
5. **数据导出**: CSV / Excel 导出
6. **审计日志**: 操作记录查看

---

## 组件分类

### 布局组件

| 组件 | 职责 |
|------|------|
| `AppLayout` | 主布局容器，注入侧边栏 + 头部 + 内容区 |
| `AppHeader` | 顶部导航栏，显示标题、日期、连接状态 |
| `AppTabBar` | 移动端底部标签栏，4 个 Tab 切换路由 |
| `SidebarNav` | 桌面端左侧导航栏 |
| `NavItem` | 单个导航项 |

### 填报组件

| 组件 | 职责 |
|------|------|
| `FillMain` | 核心表单渲染区，包含 `RecordForm` + `RecordCard` |
| `FillSidebar` | 日期/用户/模板筛选侧边栏 |
| `RecordCard` | 单条记录卡片（移动端展示） |
| `RecordForm` | 单条记录的表单渲染 |
| `AddRowDialog` | 新增行弹窗 |
| `BatchAddDialog` | 批量新增弹窗 |
| `QuickFillDialog` | 快速填写弹窗 |

### 统计组件

| 组件 | 职责 |
|------|------|
| `StatOverview` | 填报率 KPI 卡片 |
| `NumFieldStats` | 数值聚合统计 |
| `CrossStatTable` | 交叉表渲染 |
| `CrossAnalysis` | 交叉分析配置面板 |
| `StatFillAnalysis` | 填报分析视图 |

### 管理组件

| 组件 | 职责 |
|------|------|
| `AdminOverviewTab` | 系统统计概览 |
| `AdminTemplatesTab` | 模板管理列表 |
| `AdminTemplateEditor` | 内嵌模板编辑器 |
| `AdminDataTab` | 数据浏览/编辑 |
| `AdminImportTab` | JSON 导入 |
| `AdminExportTab` | 导出功能 |
| `AdminAuditTab` | 审计日志查看 |

### 通用组件

| 组件 | 职责 |
|------|------|
| `BaseModal` | 弹窗容器（`v-show` 非 `v-if`，防止 DOM 重排） |
| `ErrorListModal` | 校验错误列表弹窗 |
| `InlineToast` | 内联 Toast 通知 |
| `LoadingOverlay` | 全屏加载遮罩 |
| `PageAuth` | 页面认证守卫组件 |
| `FilterBar` | 统一筛选栏 |
| `FormField` | 动态表单字段渲染器 |
| `StatCard` | 统计摘要卡片 |

---

## 主题与样式

### Naive UI 主题覆盖 (`theme/index.ts`)

| 配置项 | 值 |
|--------|-----|
| 主色 | `#26A69A` (Teal) |
| 风格 | 碧氧清新风 |
| 特性 | 大圆角、玻璃态效果、渐变背景 |

覆盖的组件: Button, Card, DataTable, Input, Select, Tag, Tabs, Modal, Form, Alert, Progress, Message

### CSS 变量 (`styles/variables.scss`)

| 类别 | 变量 |
|------|------|
| 颜色 | `--color-primary`, `--color-secondary`, `--color-accent`, `--color-danger`, `--color-warning`, `--color-success` |
| 阴影 | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| 渐变 | `--gradient-primary`, `--gradient-secondary` |
| 玻璃态 | `--glass-bg`, `--glass-border` |
| 间距 | `--spacing-*` (4px 网格体系) |
| 圆角 | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` |
| Z-index | `--z-dropdown`, `--z-modal`, `--z-tooltip` |
| 断点 | `--breakpoint-sm` (768px) |

### 全局样式 (`styles/global.scss`)

- CSS Reset
- 字体与行高
- 滚动条美化
- 动画: `fade-in`, `slide-up`, `spin`, `scale-in`, `pulse-oxy`
- 过渡效果
- 响应式工具类

### 按钮样式 (`styles/buttons.scss`)

变体: `primary`, `default`, `ghost`, `info`, `danger`  
尺寸: `sm`, `block`  
布局: `group` 按钮组

---

## 工具模块

### utils/date.ts

| 函数 | 说明 |
|------|------|
| `normalizeDate(dateStr)` | 日期格式标准化 (`YYYY/MM/DD` → `YYYY-MM-DD`) |
| `isValidDate(dateStr)` | 日期格式验证 |
| `getCurrentDate()` | 获取当前日期 (`YYYY-MM-DD`) |

### constants.ts

| 常量 | 值 | 说明 |
|------|-----|------|
| `TOAST_DURATION` | 2200ms | Toast 自动消失时间 |
| `AUDIT_QUERY_LIMIT` | 2000 | 审计日志查询上限 |
| `MAX_RENDER_ROWS` | 1000 | 最大渲染行数 |
| `MAX_FILE_SIZE` | 10MB | 最大文件大小 |

---

## 关键架构模式

### 1. 双轨前端架构

Express 服务器 (`server.js`) 根据 `FRONTEND_VERSION` 环境变量或运行时 API 动态切换前端版本：
- `v2` →  serving `dist/`（Vue 3 SPA）
- `v1` → serving `public/`（遗留 HTML）

静态文件缓存已禁用以支持即时切换。

### 2. 乐观更新 + 失败回滚

`useDataStore.saveSubmission()` 先在本地写入数据，再同步到后端。如果后端写入失败，自动回滚本地状态。

### 3. 规则引擎

声明式的字段规则系统：
- 条件: 字段 + 11 种操作符 + 值/字段引用
- 动作: 13 种动作类型（必填/禁止/复制/校验匹配/比较等）
- 在 `useValidation` 中统一评估和执行

### 4. 整行继承

`useInheritance` 强制执行整行继承：每行数据从且仅从一个来源继承（今日 > 最近历史 > 基础模板），防止跨日期字段混合导致数据混乱。

### 5. 会话级编辑追踪

`useFormSessionEdits` 使用模块级响应式 Map，以复合键 `"userId:rowIndex:fieldHeader"` 隔离不同用户会话的编辑状态。用户切换或返回时调用 `clearAll()` 清除。

### 6. Naive UI Discrete API

`useToast` 和 `useConfirm` 使用 `createDiscreteApi`，无需 Provider 包裹，采用单例模式。

### 7. 桌面端 vs 移动端布局

| 屏幕 | 布局 |
|------|------|
| **桌面端 (≥768px)** | 固定左侧边栏 (220px) + 固定顶部头部 (56px) + 可滚动主内容区 |
| **移动端 (<768px)** | 固定顶部头部 + 固定底部标签栏 |

所有弹窗使用 `v-show` 而非 `v-if`，渲染在页面根层级以避免 `position: fixed` 被父元素 overflow 裁剪。

### 8. 统计计算基数

统计模块以**条目数**（每个模板行 = 1 个条目）为计算基数，而非字段数。仅计算实际填报人（通过 `filterField` 确定）的条目。
