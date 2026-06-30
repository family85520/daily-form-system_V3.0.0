# 每日数据填报系统 V3.0.0

> 团队协作数据收集工具 — 碧氧清新风设计

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?style=flat-square)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff?style=flat-square)](https://vitejs.dev/)
[![Naive UI](https://img.shields.io/badge/Naive%20UI-2.x-#26A69A?style=flat-square)](https://www.naiveui.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000?style=flat-square)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-sql--js-003?style=flat-square)](https://sql.js.org/)

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [文档](#文档)
- [双轨前端](#双轨前端)
- [数据库与备份](#数据库与备份)
- [命令参考](#命令参考)
- [设计规范](#设计规范)

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **多模板管理** | 创建和管理多个表单模板，支持自定义字段和行 |
| **多人协作** | 按责任人分配填报任务，自动筛选 |
| **数据继承** | 三级继承机制（今日 → 历史 → 基础），整行继承不混字段 |
| **字段规则** | 11 种操作符 + 13 种动作类型的声明式规则引擎 |
| **历史记录** | 按日期/用户浏览历史填报数据 |
| **统计分析** | 填报率看板、数值聚合、交叉透视表 |
| **数据导出** | CSV / Excel 导出，支持筛选 |
| **数据导入** | JSON 模板导入，字段自动重命名 |
| **审计日志** | 完整操作记录追溯，支持筛选 |
| **双轨前端** | 运行时切换 V1/V2 前端版本 |
| **响应式设计** | 桌面端侧边栏布局 + 移动端底部标签栏 |
| **自动备份** | 数据库防抖写盘 + 每日自动备份 + 项目快照 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | Vue 3 (Composition API + `<script setup lang="ts">`) |
| **构建工具** | Vite 5 |
| **语言** | TypeScript |
| **路由** | Vue Router 4 |
| **状态管理** | Pinia |
| **UI 组件库** | Naive UI |
| **HTTP 请求** | Axios |
| **样式** | SCSS + CSS 自定义属性 + Naive UI 主题定制 |
| **后端框架** | Express 4 |
| **数据库** | SQLite via sql.js (WASM) |
| **验证** | Zod (后端) |
| **密码** | bcrypt |

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

需要两个终端：

```bash
# 终端 1: 启动后端服务
npm run server

# 终端 2: 启动前端开发服务器
npm run dev
```

- 前端: `http://localhost:5173`
- 后端: `http://localhost:3000`

### 3. 生产部署

```bash
# 构建前端
npm run build

# 启动服务
npm start
```

访问 `http://localhost:3000`。

---

## 项目结构

```
├── src/                          # 源代码（前端 + 后端共用）
│   ├── main.ts                   # 前端入口
│   ├── App.vue                   # 根组件
│   ├── router/                   # 路由配置
│   ├── stores/                   # Pinia 状态管理
│   ├── composables/              # 组合式函数
│   ├── api/                      # Axios API 封装
│   ├── types/                    # TypeScript 类型定义
│   ├── views/                    # 页面组件
│   ├── components/               # 组件
│   │   ├── layout/               # 布局组件
│   │   ├── fill/                 # 填报组件
│   │   ├── stat/                 # 统计组件
│   │   ├── admin/                # 管理组件
│   │   ├── common/               # 通用组件
│   │   └── template/             # 模板组件
│   ├── styles/                   # 样式文件
│   ├── theme/                    # 主题配置
│   ├── utils/                    # 工具函数
│   ├── config/                   # 后端配置
│   ├── db/                       # 后端数据库
│   ├── routes/                   # 后端路由
│   ├── middleware/               # 后端中间件
│   ├── services/                 # 后端服务
│   └── constants/                # 后端常量
├── public/                       # V1 前端（遗留 HTML）
├── dist/                         # V2 前端构建产物
├── data/                         # 数据库 + 备份
│   ├── app.db                    # SQLite 数据库文件
│   └── backups/                  # 自动/手动/快照备份
├── tests/                        # 测试文件
├── docs/                         # 项目文档
├── scripts/                      # 工具脚本
├── server.js                     # Express 应用入口
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [API 文档](docs/api.md) | 完整的后端 RESTful API 接口说明 |
| [数据库文档](docs/database.md) | 表结构、迁移策略、备份机制 |
| [前端架构](docs/frontend-architecture.md) | 前端技术栈、类型定义、组件分类、架构模式 |
| [部署指南](docs/deployment.md) | 生产环境部署、环境变量、Nginx 配置 |
| [用户手册](docs/user-guide.md) | 系统使用指南（填报/历史/统计/管理） |
| [开发指南](docs/development-guide.md) | 前端开发规范、编码约定、调试技巧 |
| [CLAUDE.md](CLAUDE.md) | 面向 AI 助手的代码库指南 |

---

## 双轨前端

系统支持运行时切换 V1（遗留 HTML）和 V2（Vue 3）前端。

### 切换方式

| 方式 | 说明 |
|------|------|
| **环境变量** | `FRONTEND_VERSION=v2 node server.js` |
| **管理 API** | `POST /api/admin/switch-frontend {version: "v2"}` |
| **管理页面** | AdminPage.vue 中的版本切换入口 |
| **浏览器控制台** | `fetch('/api/admin/switch-frontend', ...)` |

### 切换后刷新页面即可看到新版本。

详细切换方式参见 [启动填报系统说明.md](启动填报系统说明.md)。

---

## 数据库与备份

### 数据库

- **引擎**: SQLite via sql.js（WASM，无原生依赖）
- **文件**: `data/app.db`
- **持久化**: 内存操作 + 100ms 防抖写盘 + 进程退出强制落盘

### 备份机制

| 机制 | 说明 |
|------|------|
| **防抖写盘** | 修改后 100ms 内只写一次 |
| **进程退出** | 监听退出信号强制落盘 |
| **自动备份** | 每天一次 `.db` 副本，保留 7 天 |
| **项目快照** | `npm run snapshot`，最多保留 10 个 |

### 快照命令

```bash
npm run snapshot              # 创建快照
npm run snapshot:list          # 列出所有快照
node scripts/snapshot-all.js restore <快照名称>   # 恢复
node scripts/snapshot-all.js delete <快照名称>    # 删除
```

---

## 命令参考

### 开发

| 命令 | 说明 |
|------|------|
| `npm run dev` | Vite 开发服务器 (:5173) + 代理 /api 到 :3000 |
| `npm run server` | Express 后端 (:3000) |

### 生产

| 命令 | 说明 |
|------|------|
| `npm run build` | 类型检查 + Vite 构建 → dist/ |
| `npm start` | 构建 + 启动 Express 服务器 (:3000) |

### 质量

| 命令 | 说明 |
|------|------|
| `npm run type-check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查（前端） |
| `npm run lint:fix` | 自动修复 lint 问题 |
| `npm run review` | type-check + lint + test 组合 |

### 测试

| 命令 | 说明 |
|------|------|
| `npm run test` | 单次运行 |
| `npm run test:watch` | Watch 模式 |
| `npm run test:coverage` | 带覆盖率 |

### 快照

| 命令 | 说明 |
|------|------|
| `npm run snapshot` | 创建项目快照 |
| `npm run snapshot:list` | 列出所有快照 |
| `./rollback.bat` | 回滚整个项目 |
| `./rollback-db.bat` | 仅回滚数据库 |

---

## 设计规范

### 碧氧清新风

| 属性 | 值 |
|------|-----|
| **主色** | `#26A69A` (Teal) |
| **风格** | 大圆角、玻璃态效果、渐变背景 |
| **间距** | 4px 网格体系 |
| **断点** | 768px（桌面/移动端分界） |

CSS 变量定义在 [`src/styles/variables.scss`](src/styles/variables.scss)。

### 布局

| 屏幕 | 布局 |
|------|------|
| **桌面端 (≥768px)** | 固定左侧边栏 (220px) + 固定顶部头部 (56px) + 可滚动主内容区 |
| **移动端 (<768px)** | 固定顶部头部 + 固定底部标签栏 |

### 编码约定

- Vue 组件使用 `<script setup lang="ts">` + Composition API
- Naive UI 组件必须显式导入（不使用自动导入插件）
- 前端 TypeScript，后端 JavaScript（CommonJS）
- 所有弹窗使用 `v-show` 而非 `v-if`，渲染在页面根层级
