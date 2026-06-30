# CLAUDE.md

本项目是每日数据填报系统 V3.0.0 — 一个团队协作数据收集工具，已从单文件 HTML 应用重写为 Vue 3 + TypeScript。Express 后端通过运行时"双轨"开关同时支持遗留 V1 前端 (`public/`) 和新的 Vue 3 前端 (`dist/`)。

**UI 设计风格**: 碧氧清新风 — Teal 主色调 (`#26A69A`)，大圆角，玻璃态效果，渐变背景。CSS 变量定义在 `src/styles/variables.scss`。

## 命令

```bash
# 开发
npm run dev              # Vite 开发服务器 (:5173)，代理 /api 到 localhost:3000
npm run server           # Express 后端 (:3000)，先运行或在第二个终端运行

# 生产
npm run build            # 类型检查 (vue-tsc) + Vite 构建 → dist/
npm start                # 构建 + 启动 Express 服务器 (:3000)

# 质量检查
npm run type-check       # TypeScript 类型检查 (vue-tsc --noEmit)
npm run lint             # ESLint（仅前端，后端 JS 已排除）
npm run lint:fix         # 自动修复 lint 问题
npm run review           # type-check + lint + test 组合

# 测试
npm run test             # 单次运行 (vitest run)
npm run test:watch       # Watch 模式
npm run test:coverage    # 带覆盖率

# 运行单个测试文件
npx vitest run tests/composables/useValidation.test.ts

# 快照（无 Git — 项目使用自定义快照系统）
npm run snapshot         # 创建项目快照
npm run snapshot:list    # 列出所有快照
node scripts/snapshot-all.js restore <快照名称>

# 回滚
./rollback.bat           # 回滚整个项目
./rollback-db.bat        # 仅回滚数据库
```

## 文档索引

详细的文档位于 `docs/` 目录：

| 文档 | 说明 |
|------|------|
| [docs/api.md](docs/api.md) | 完整的后端 RESTful API 接口文档 |
| [docs/database.md](docs/database.md) | SQLite 数据库表结构、迁移策略、备份机制 |
| [docs/frontend-architecture.md](docs/frontend-architecture.md) | 前端技术栈、类型定义、组件分类、架构模式 |
| [docs/deployment.md](docs/deployment.md) | 生产环境部署指南、环境变量、Nginx 配置 |
| [docs/user-guide.md](docs/user-guide.md) | 系统使用手册（填报/历史/统计/管理） |
| [docs/development-guide.md](docs/development-guide.md) | 前端开发规范、编码约定、调试技巧 |

## 架构

### 布局结构（桌面端 vs 移动端）
- **桌面端 (≥768px)**: 固定左侧边栏 (`SidebarNav.vue`, 220px) + 固定顶部头部 (`AppHeader.vue`, 56px) + 可滚动主内容区
- **移动端 (<768px)**: 固定顶部头部 + 固定底部标签栏 (`AppTabBar.vue`)
- 所有页面通过 `AppLayout` 包装器渲染
- 填报页面桌面端布局：侧边栏和主区域均使用 `position: fixed` 防止滚动干扰

### 双轨前端
Express 服务器 (`server.js`) 根据 `FRONTEND_VERSION` 环境变量或运行时 API `POST /api/admin/switch-frontend {version: "v1"|"v2"}` 动态提供 `dist/` (V2, Vue 3) 或 `public/` (V1, 遗留 HTML)。静态文件缓存已禁用以支持即时切换。

### 前端（Vue 3 + TypeScript）
- **入口**: `src/main.ts` → `src/App.vue` → 4 个路由
- **路由**: `/` (FillPage), `/history` (HistoryPage), `/stat` (StatPage, 认证门控), `/admin` (AdminPage, 密码门控)
- **状态**: Pinia stores（`useAuthStore` 用于认证/token，`useDataStore` 用于所有应用数据）
- **API 层**: `src/api/` — Axios 实例，带 token 注入拦截器和 401 自动重定向
- **Composables** (`src/composables/`):
  - `useInheritance` — 三级数据继承（今日 → 最近历史 → 基础模板数据）。仅行级继承，从不混合不同日期的字段。`batchGetEffectiveRows()` 响应式读取 `dataStore.sub`
  - `useValidation` — 字段校验 + 规则引擎（11 种操作符，13 种动作类型）
  - `useSequence` — 带模块级缓存的自增序列字段（`tplId:header → maxVal`）
  - `useFormSessionEdits` — 通过模块级 `Map` 追踪用户编辑字段，复合键 `"userId:rowIndex:fieldHeader"`；用户切换/返回时调用 `clearAll()`
  - `useToast`, `useConfirm`, `useLoading` — 通过 Naive UI discrete API 实现的 UI 工具
- **工具**: `src/utils/date.ts` — `normalizeDate()`, `isValidDate()`, `getCurrentDate()`
- **路径别名**: `@` 映射到 `src/`（在 vite.config.ts 和 vitest.config.ts 中配置）
- **样式**: SCSS + CSS 自定义属性（`:root` → `src/styles/variables.scss`），全局重置在 `src/styles/global.scss`
- **主题**: Naive UI 主题覆盖在 `src/theme/index.ts`，主色 `#26A69A`

### 后端（Express + sql.js）
- **入口**: `server.js` → 初始化数据库、运行迁移、启动 Express
- **数据库**: SQLite via sql.js（WASM，无原生依赖）。内存操作 + 100ms 防抖写入 `data/app.db`。进程退出时自动保存。
- **认证**: SQLite 持久化的 token 会话 + 内存缓存（30 分钟滑动过期，500 硬上限）。`requireAuth` 中间件用于管理操作，`optionalAuth` 用于一般读取。Token 通过 `x-auth-token` header 传递。
- **路由** (`src/routes/`): auth, data, template, submission, member, export, audit
- **中间件流水线**: 安全头 → 速率限制（按端点）→ 认证 → 验证 → 错误处理
- **配置**: `src/config/index.js` — 端口、数据库路径、会话时长、速率限制、备份间隔、默认密码、`MIN_PASSWORD_LENGTH: 6`
- **验证**: `src/middleware/zodValidate.js` — Zod 请求体验证中间件
- **审计**: `src/constants/auditActions.js` — 类型化动作常量；`src/db/backup.js` — 自动备份 + 审计清理
- **服务**: `src/services/session.js` — 会话 CRUD（SQLite 持久化 + 内存缓存）
- **共享助手**: `src/db/queryHelpers.js` — `rowToTemplate()`, `rowToSubmission()` 等
- **数据库工具**: `src/db/database.js` — `runSQL()`/`execSQL()` Promise 包装，`withTransaction()`（正确 await），`queryOne()`/`queryAll()`

### 关键数据模型
- **模板**: 定义列（类型/必填/约束）+ 基础行 + 字段规则
- **提交数据**: 嵌套为 `tplId → date → user → rowIndex → fieldValues`
- **成员**: 按模板追踪
- **字段规则**: 条件（字段 + 操作符 + 值）→ 动作（必填/禁止/复制/校验匹配/比较）
- **filterField**: 模板级字段，用于将行分配给特定填报人（如"责任人"列决定谁填哪些行）
- **数据库表**: `templates`, `submissions`（JSON 数据列）, `members`, `audit_log`, `sessions`, `system`

### 统计计算（重要）
统计模块（`StatOverview.vue`, `StatFillAnalysis.vue`）以**条目数**（每个模板行 = 1 个条目）为计算基数，而非字段数。仅计算**实际填报人**（由 `filterField` 确定）的条目。参见 `getUserRowIndices()` 辅助函数。

### 弹窗/对话框
所有对话框（`BaseModal.vue`）使用 `v-show`（非 `v-if`）以防止 DOM 重排跳动。渲染在**页面根层级**（如 `FillPage.vue`），从不嵌套在 `RecordCard` 等子组件内。这确保 `position: fixed` 定位不被父元素 overflow 裁剪。

### 语言分离
前端是 TypeScript；后端是纯 JavaScript（CommonJS）。后端未被重构 — 仅修改了 `server.js` 以支持双轨开关。ESLint 配置为忽略所有后端 JS 文件。

## 约定

- Vue 组件使用 `<script setup lang="ts">` + Composition API
- **Naive UI 组件必须显式导入** — 项目不使用 `unplugin-vue-components`。模板中使用的每个 `<n-*>` 组件都必须有对应的 `naive-ui` 命名导入
- Naive UI toast/confirm 使用 `createDiscreteApi`（无需 Provider 包裹）
- 样式使用双层主题：CSS 自定义属性（`:root`）映射到 SCSS 变量
- 测试位于 `tests/` 目录，镜像 `src/` 结构；测试文件为 `*.test.ts`
- 无 Git — 重大变更前使用 `npm run snapshot`；最多保留 10 个快照
- 路径别名 `@` 映射到 `src/`
